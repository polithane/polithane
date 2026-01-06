import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function mustEnv(name) {
  const v = String(process.env[name] || '').trim();
  if (!v) throw new Error(`${name} is required`);
  return v;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function publicUrlFor(supabaseUrl, bucket, objectPath) {
  const base = String(supabaseUrl || '').replace(/\/+$/, '');
  const p = String(objectPath || '').replace(/^\/+/, '');
  return `${base}/storage/v1/object/public/${bucket}/${p}`;
}

async function run(cmd, args, { timeoutMs = 10 * 60_000 } = {}) {
  return await new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const t = setTimeout(() => {
      try {
        p.kill('SIGKILL');
      } catch {
        // ignore
      }
      reject(new Error(`${cmd} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    p.stdout.on('data', (d) => (out += d.toString('utf8')));
    p.stderr.on('data', (d) => (err += d.toString('utf8')));
    p.on('error', (e) => {
      clearTimeout(t);
      reject(e);
    });
    p.on('close', (code) => {
      clearTimeout(t);
      if (code === 0) return resolve({ out, err });
      reject(new Error(`${cmd} failed (code ${code}): ${err || out}`));
    });
  });
}

async function ffprobeJson(inputPath) {
  const { out } = await run('ffprobe', [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_streams',
    '-show_format',
    inputPath,
  ]);
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function rotationFromProbe(probe) {
  try {
    const streams = Array.isArray(probe?.streams) ? probe.streams : [];
    const v = streams.find((s) => s?.codec_type === 'video') || null;
    if (!v) return 0;
    // common: tags.rotate or side_data_list.rotation
    const tagRot = Number(v?.tags?.rotate || 0) || 0;
    if (tagRot) return ((tagRot % 360) + 360) % 360;
    const side = Array.isArray(v?.side_data_list) ? v.side_data_list : [];
    const rot = side.find((x) => x?.rotation !== undefined)?.rotation;
    const n = Number(rot || 0) || 0;
    return ((n % 360) + 360) % 360;
  } catch {
    return 0;
  }
}

function hasAudioStream(probe) {
  try {
    const streams = Array.isArray(probe?.streams) ? probe.streams : [];
    return streams.some((s) => s?.codec_type === 'audio');
  } catch {
    return false;
  }
}

function buildVideoFilter({ rotationDeg }) {
  const parts = [];

  // Apply rotation into pixels (so output has rotate=0)
  // transpose values:
  // 1: clockwise 90
  // 2: counter-clockwise 90
  // 2,transpose=2: 180 (or hflip,vflip)
  if (rotationDeg === 90) parts.push('transpose=1');
  else if (rotationDeg === 270) parts.push('transpose=2');
  else if (rotationDeg === 180) parts.push('hflip,vflip');

  // Standardize to portrait stage: contain + pad (NO CROP)
  parts.push('scale=720:1280:force_original_aspect_ratio=decrease');
  parts.push('pad=720:1280:(ow-iw)/2:(oh-ih)/2:black');
  parts.push('setsar=1');

  return parts.join(',');
}

async function main() {
  const SUPABASE_URL = mustEnv('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = mustEnv('SUPABASE_SERVICE_ROLE_KEY');

  const POLL_MS = Math.max(2000, Number(process.env.MEDIA_WORKER_POLL_MS || 4000) || 4000);
  const MAX_ATTEMPTS = Math.max(1, Number(process.env.MEDIA_WORKER_MAX_ATTEMPTS || 4) || 4);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log(`[media-worker] started at ${nowIso()} poll=${POLL_MS}ms maxAttempts=${MAX_ATTEMPTS}`);

  // Basic dependency check
  try {
    await run('ffmpeg', ['-version'], { timeoutMs: 10_000 });
    await run('ffprobe', ['-version'], { timeoutMs: 10_000 });
  } catch (e) {
    console.error('[media-worker] ffmpeg/ffprobe missing:', e?.message || e);
    process.exit(1);
  }

  while (true) {
    try {
      // Pick one queued job (simple MVP polling).
      const { data: jobs, error } = await supabase
        .from('media_jobs')
        .select('*')
        .eq('status', 'queued')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      const job = jobs?.[0] || null;
      if (!job) {
        await sleep(POLL_MS);
        continue;
      }

      // Try to claim it (best-effort).
      const { data: claimed, error: claimErr } = await supabase
        .from('media_jobs')
        .update({
          status: 'processing',
          attempts: Number(job.attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'queued')
        .select('*')
        .limit(1);

      if (claimErr) throw claimErr;
      const active = claimed?.[0] || null;
      if (!active) {
        await sleep(300);
        continue;
      }

      const attempt = Number(active.attempts || 0) || 1;
      if (attempt > MAX_ATTEMPTS) {
        await supabase
          .from('media_jobs')
          .update({ status: 'error', last_error: 'Max attempts exceeded', updated_at: new Date().toISOString() })
          .eq('id', active.id);
        await sleep(200);
        continue;
      }

      console.log(`[media-worker] processing job=${active.id} post=${active.post_id} attempt=${attempt}`);

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'polithane-media-'));
      const inFile = path.join(tmpDir, 'input');
      const outFile = path.join(tmpDir, 'output.mp4');
      const thumbFile = path.join(tmpDir, 'thumb.jpg');

      try {
        // Download input
        const bucket = String(active.input_bucket || '').trim();
        const objectPath = String(active.input_path || '').trim();
        if (!bucket || !objectPath) throw new Error('Invalid job input bucket/path');

        const { data: dl, error: dlErr } = await supabase.storage.from(bucket).download(objectPath);
        if (dlErr) throw dlErr;
        const ab = await dl.arrayBuffer();
        await fs.writeFile(inFile, Buffer.from(ab));

        const probe = await ffprobeJson(inFile);
        const rot = rotationFromProbe(probe);
        const audio = hasAudioStream(probe);
        const vf = buildVideoFilter({ rotationDeg: rot });

        // Transcode -> MP4 (faststart for fast loading)
        const ffArgs = [
          '-y',
          '-i',
          inFile,
          '-vf',
          vf,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '28',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
        ];
        if (audio) {
          ffArgs.push('-c:a', 'aac', '-b:a', '96k', '-ar', '48000', '-ac', '2');
        } else {
          ffArgs.push('-an');
        }
        ffArgs.push(outFile);

        await run('ffmpeg', ffArgs, { timeoutMs: 12 * 60_000 });

        // Thumbnail from the processed output (keeps orientation consistent)
        await run(
          'ffmpeg',
          [
            '-y',
            '-ss',
            '0.5',
            '-i',
            outFile,
            '-frames:v',
            '1',
            '-q:v',
            '4',
            '-vf',
            'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black',
            thumbFile,
          ],
          { timeoutMs: 60_000 }
        );

        // Upload outputs
        const outBucket = String(active.output_bucket || 'uploads');
        const thumbBucket = String(active.thumbnail_bucket || 'uploads');

        const postId = String(active.post_id || '').trim() || 'post';
        const userId = String(active.user_id || '').trim() || 'user';
        const baseName = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const outPath = `posts/processed/${userId}/${postId}/${baseName}.mp4`;
        const thumbPath = `posts/thumbnails/${userId}/${postId}/${baseName}.jpg`;

        const outBuf = await fs.readFile(outFile);
        const thumbBuf = await fs.readFile(thumbFile);

        const { error: upErr } = await supabase.storage.from(outBucket).upload(outPath, outBuf, {
          contentType: 'video/mp4',
          upsert: true,
          cacheControl: '31536000',
        });
        if (upErr) throw upErr;

        const { error: thErr } = await supabase.storage.from(thumbBucket).upload(thumbPath, thumbBuf, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '31536000',
        });
        if (thErr) throw thErr;

        const outPublicUrl = publicUrlFor(SUPABASE_URL, outBucket, outPath);
        const thumbPublicUrl = publicUrlFor(SUPABASE_URL, thumbBucket, thumbPath);

        // Mark job done
        await supabase
          .from('media_jobs')
          .update({
            status: 'done',
            output_bucket: outBucket,
            output_path: outPath,
            output_public_url: outPublicUrl,
            thumbnail_bucket: thumbBucket,
            thumbnail_path: thumbPath,
            thumbnail_public_url: thumbPublicUrl,
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', active.id);

        // Update post: replace first media url, set thumbnail, set ready
        // (best-effort; schema may differ)
        try {
          const { data: postRows } = await supabase
            .from('posts')
            .select('id,media_urls,thumbnail_url')
            .eq('id', active.post_id)
            .limit(1);
          const p0 = postRows?.[0] || null;
          const list = Array.isArray(p0?.media_urls) ? p0.media_urls : Array.isArray(p0?.media_urls?.urls) ? p0.media_urls.urls : [];
          const nextUrls = Array.isArray(list) && list.length > 0 ? [outPublicUrl, ...list.slice(1)] : [outPublicUrl];
          await supabase
            .from('posts')
            .update({
              media_urls: nextUrls,
              thumbnail_url: thumbPublicUrl,
              media_status: 'ready',
              media_processed_at: new Date().toISOString(),
              media_processing_error: null,
            })
            .eq('id', active.post_id);
        } catch {
          // ignore
        }

        console.log(`[media-worker] done job=${active.id} post=${active.post_id}`);
      } catch (e) {
        const msg = String(e?.message || e || 'unknown');
        console.error(`[media-worker] error job=${active?.id}:`, msg);
        await supabase
          .from('media_jobs')
          .update({ status: 'queued', last_error: msg, updated_at: new Date().toISOString() })
          .eq('id', active.id);
        // Best-effort post status
        try {
          await supabase
            .from('posts')
            .update({ media_status: 'processing', media_processing_error: msg })
            .eq('id', active.post_id);
        } catch {
          // ignore
        }
      } finally {
        try {
          await fs.rm(tmpDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.error('[media-worker] loop error:', String(e?.message || e));
      await sleep(Math.max(2000, POLL_MS));
    }
  }
}

main().catch((e) => {
  console.error('[media-worker] fatal:', e);
  process.exit(1);
});

