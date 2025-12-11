/**
 * Test Cyrillic → Turkish mapping
 */

const CYRILLIC_TO_TURKISH = {
  'Ш': 'İ',
  'Щ': 'Ö',
  'Ъ': 'Ü',
  'Ю': 'Ş',
  'ж': 'Ğ',
  'А': 'Ç',
  'О': 'Ö',
  'ш': 'i',
  'щ': 'ö',
  'ъ': 'ü',
  'ю': 'ş',
  'а': 'ç',
  'о': 'ö',
  'ғ': 'ğ',
};

function cyrillicToTurkish(filename) {
  let result = filename;
  
  for (const [cyrillic, turkish] of Object.entries(CYRILLIC_TO_TURKISH)) {
    result = result.split(cyrillic).join(turkish);
  }
  
  return result;
}

// Test cases from database analysis
const testCases = [
  ['CELALETTШN_ERASLAN.jpg', 'CELALETTİN_ERASLAN.jpg'],
  ['ABDЪLCELШL_АELШK.jpg', 'ABDÜLCELİL_ÇELİK.jpg'],
  ['ABDULLAH_YAЮAR.jpg', 'ABDULLAH_YAŞAR.jpg'],
  ['BЪNYAMШN_SЪRMELШ.jpg', 'BÜNYAMİN_SÜRMELİ.jpg'],
  ['AHMET_ЩZER.jpg', 'AHMET_ÖZER.jpg'],
  ['ALPER_YEжШN.jpg', 'ALPER_YEĞİN.jpg'],
  ['ADEM_BARIЮ_AЮKIN.jpg', 'ADEM_BARIŞ_AŞKIN.jpg'],
  ['ALTUж_DЩKMECШ.jpg', 'ALTUĞ_DÖKMECİ.jpg'],
  ['AHMET_ATAА.jpg', 'AHMET_ATAÇ.jpg'],
  ['BEHШCE_YILDIZ_ЪNSAL.jpg', 'BEHİCE_YILDIZ_ÜNSAL.jpg'],
];

console.log('🧪 Testing Cyrillic → Turkish mapping\n');
console.log('='.repeat(70));

let passCount = 0;
let failCount = 0;

testCases.forEach(([input, expected], idx) => {
  const result = cyrillicToTurkish(input);
  const pass = result === expected;
  
  if (pass) {
    passCount++;
    console.log(`✅ Test ${idx + 1}: PASS`);
  } else {
    failCount++;
    console.log(`❌ Test ${idx + 1}: FAIL`);
    console.log(`   Input:    ${input}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Got:      ${result}`);
  }
});

console.log('='.repeat(70));
console.log(`\n📊 Results: ${passCount} PASS / ${failCount} FAIL`);

if (failCount === 0) {
  console.log('🎉 All tests passed!');
} else {
  console.log('⚠️  Some tests failed. Check mapping.');
  process.exit(1);
}
