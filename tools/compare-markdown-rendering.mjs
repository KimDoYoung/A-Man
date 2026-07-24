import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOOLS_DIR = __dirname;
const RESULTS_DIR = path.join(TOOLS_DIR, 'results');
const TEST_SOURCE_FILE = path.join(TOOLS_DIR, 'test-source.md');

// Ensure directories exist
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// 1. Create a comprehensive markdown test source file if it doesn't exist
const testMarkdownContent = `# 도움말 제목

이것은 **A-Man 도움말/매뉴얼** 마크다운 변환 테스트 파일입니다.

## 1. 텍스트 서식 및 일반 규칙
이곳에는 *이탤릭* 텍스트와 **볼드** 텍스트가 있습니다. ~~취소선~~도 작동해야 합니다.
일반 텍스트 사이의 줄바꿈(soft break)은 \`<br />\` 태그로 변환되어야 합니다.
한 줄을 바꾸는 것
그리고 두 줄을 바꾸는 것은 문단(p) 분리입니다.

## 2. 목록 테스트
* 순서 없는 목록 1
* 순서 없는 목록 2
  * 서브 순서 없는 목록 2-1

1. 순서 있는 목록 1
2. 순서 있는 목록 2

- [ ] 태스크 리스트 미완료
- [x] 태스크 리스트 완료

## 3. 코드 및 키보드/버튼 (커스텀 백틱) 테스트
이것은 일반 인라인 코드인 \`npm install\` 입니다.
이것은 시스템에 정의된 커스텀 조회 버튼 \`조회\` 입니다.
이것은 또 다른 정의된 저장 버튼 \`저장\` 입니다.
이것은 삭제 버튼인 \`삭제\` 입니다.
이것은 임의로 지정한 커스텀 버튼 문법인 \`FF5733:fas fa-cogs:커스텀설정\` 입니다.

## 4. 테이블 테스트
| 항목 | 설명 | 비고 |
| :--- | :--- | :--- |
| 자산구분 | 국내주식, 해외주식 등 | 필수입력 |
| 거래소 | KRX, NYSE 등 | 선택입력 |

## 5. 이미지 및 링크 테스트
![A-Man Logo](/aman/images/logo.png)
자세한 정보는 [AssetERP 홈페이지](https://www.kfs.co.kr)를 참고하세요.
`;

if (!fs.existsSync(TEST_SOURCE_FILE)) {
  fs.writeFileSync(TEST_SOURCE_FILE, testMarkdownContent, 'utf8');
  console.log(`[TestRunner] 마크다운 테스트 예제 파일을 생성했습니다: ${TEST_SOURCE_FILE}`);
} else {
  console.log(`[TestRunner] 기존 마크다운 테스트 소스 파일을 사용합니다: ${TEST_SOURCE_FILE}`);
}

// Helper to run backend parser via Gradle
function runBackendParser(markdown) {
  const backendDir = path.resolve(TOOLS_DIR, '../backend');
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  
  console.log('[TestRunner] Gradle을 통해 Java Flexmark 파서 구동 중...');
  const result = spawnSync(gradlew, ['-q', 'runParserCLI'], {
    input: markdown,
    cwd: backendDir,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });



  if (result.error) {
    console.error('[TestRunner] Failed to spawn Gradle process:', result.error);
    throw result.error;
  }
  if (result.status !== 0) {
    console.error('[TestRunner] Gradle runParserCLI task failed:', result.stderr);
    throw new Error(`Gradle run failed with code ${result.status}`);
  }

  return result.stdout;
}

// Helper to run frontend parser via Node.js
function runFrontendParser(markdown) {
  console.log('[TestRunner] Node.js를 통해 React-Markdown 파서 구동 중...');
  const result = spawnSync('node', [path.join(TOOLS_DIR, 'md-parser-cli.mjs')], {

    input: markdown,
    cwd: TOOLS_DIR,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });

  if (result.error) {
    console.error('[TestRunner] Failed to spawn Node process:', result.error);
    throw result.error;
  }
  if (result.status !== 0) {
    console.error('[TestRunner] md-parser-cli.mjs failed:', result.stderr);
    throw new Error(`Node parser failed with code ${result.status}`);
  }

  return result.stdout;
}


// Normalize HTML for semantic structural comparison
function normalizeHtml(htmlString) {
  // Load snippet without html/head/body wrappers
  const $ = cheerio.load(htmlString, null, false);
  
  // Remove preloading link tags injected by React 19 SSR
  $('link').remove();

  // Remove align attributes on table headers and cells
  $('th, td').removeAttr('align');

  // Remove readonly attributes on input checkboxes
  $('input').removeAttr('readonly');

  // Unify input checkbox attributes (disabled, checked) to standard formats
  $('input[type="checkbox"]').each((i, el) => {
    const $el = $(el);
    if ($el.attr('disabled') !== undefined) {
      $el.attr('disabled', 'disabled');
    }
    if ($el.attr('checked') !== undefined) {
      $el.attr('checked', 'checked');
    }
  });


  // 1. Remove classes, styles, and dev attributes from all tags (except <i> tag classes)
  $('*').each((i, el) => {
    const $el = $(el);
    
    // Strip unwanted attributes
    Object.keys(el.attribs).forEach(attr => {
      if (
        attr.startsWith('data-') || 
        attr === 'style' || 
        attr === 'target' || 
        attr === 'rel' ||
        attr === 'aria-hidden' ||
        attr === 'node'
      ) {
        $el.removeAttr(attr);
      }
    });


    // Strip class unless it is an <i> tag containing icon names (fas fa-*)
    if (el.name !== 'i') {
      $el.removeAttr('class');
    } else {
      let classes = $el.attr('class') || '';
      // Filter out utility classes and keep unique fontawesome identifiers, sorting for safety
      classes = classes
        .split(/\s+/)
        .filter(c => c !== 'kbd-fa-icon' && c !== 'kbd-icon')
        .sort()
        .join(' ');
      $el.attr('class', classes);
    }
  });

  // 2. String level whitespace normalization
  let cleanHtml = $.html();
  cleanHtml = cleanHtml
    .replace(/\r\n/g, '\n')
    .replace(/&nbsp;/g, ' ')           // Unify nbsp into standard space
    .replace(/\s+/g, ' ')             // collapse spaces
    .replace(/>\s*</g, '>\n<')        // put newline between tags for easy diffing
    .replace(/checked="checked"\s+disabled="disabled"/g, 'disabled="disabled" checked="checked"')
    .replace(/<br\s*\/?>/gi, '<br>')   // unify break tags
    .replace(/<input([^>]*?)\s*\/?>/gi, '<input$1>') // unify input self-closing
    .replace(/<img([^>]*?)\s*\/?>/gi, '<img$1>')     // unify img self-closing
    .replace(/<hr([^>]*?)\s*\/?>/gi, '<hr$1>')       // unify hr self-closing
    .trim();
    
  return cleanHtml;
}



async function runComparison() {
  const markdownInput = fs.readFileSync(TEST_SOURCE_FILE, 'utf8');

  // 1. Get raw html from both
  const backendRaw = runBackendParser(markdownInput);
  const frontendRaw = runFrontendParser(markdownInput);

  // Write raw outputs to results folder
  fs.writeFileSync(path.join(RESULTS_DIR, 'backend-raw.html'), backendRaw, 'utf8');
  fs.writeFileSync(path.join(RESULTS_DIR, 'frontend-raw.html'), frontendRaw, 'utf8');
  console.log('[TestRunner] 원본 HTML 결과물들을 tools/results/ 에 저장했습니다.');

  // 2. Normalize html
  const backendNormalized = normalizeHtml(backendRaw);
  const frontendNormalized = normalizeHtml(frontendRaw);

  // Write normalized outputs to results folder
  fs.writeFileSync(path.join(RESULTS_DIR, 'backend-normalized.html'), backendNormalized, 'utf8');
  fs.writeFileSync(path.join(RESULTS_DIR, 'frontend-normalized.html'), frontendNormalized, 'utf8');
  console.log('[TestRunner] 정규화된 HTML 결과물들을 tools/results/ 에 저장했습니다.');

  // 3. Assert Equivalence
  if (backendNormalized === frontendNormalized) {
    console.log('\n\x1b[32m[통과] HTML 동일성 검증 완료! 두 파서의 결과가 구조적/의미론적으로 100% 일치합니다.\x1b[0m\n');
    process.exit(0);
  } else {
    console.error('\n\x1b[31m[실패] HTML 구조 불일치 감지! 두 파서의 변환 결과가 다릅니다.\x1b[0m');
    console.log('[TestRunner] 아래 명령어를 입력하여 정교한 차이점(diff)을 비교해 보세요:');
    const relativeBackend = path.relative(process.cwd(), path.join(RESULTS_DIR, 'backend-normalized.html'));
    const relativeFrontend = path.relative(process.cwd(), path.join(RESULTS_DIR, 'frontend-normalized.html'));
    console.log(`\x1b[33mdiff -u ${relativeBackend} ${relativeFrontend}\x1b[0m\n`);
    process.exit(1);
  }


}

runComparison().catch(err => {
  console.error('[TestRunner] Execution failed:', err);
  process.exit(1);
});
