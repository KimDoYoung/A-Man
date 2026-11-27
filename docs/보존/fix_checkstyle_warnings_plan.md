# 구현 계획: Checkstyle 코드 스타일 경고 해결

코드 스타일 정적 검사(Checkstyle) 결과 발견된 4가지 경고 사항을 해결하여 코드 표준을 준수하고 품질을 향상하기 위한 계획입니다.

## 1. Goal Description
Checkstyle 검사기에서 감지된 다음 경고들을 수정합니다:
*   `if` 제어문에 중괄호 `{}`가 누락된 부분 보완 (규칙: `NeedBraces`).
*   로컬 변수 `sha256_HMAC`의 명명 규칙 위반 수정 (규칙: `LocalVariableName` - 소문자로 시작하는 camelCase 준수).

---

## 2. Proposed Changes

### [Component] Security & Utils (`kr.co.kfs.aman`)

#### [MODIFY] `ErpTokenValidationFilter.java` ([ErpTokenValidationFilter.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/security/ErpTokenValidationFilter.java))
*   **L104**: `if (trimmedPattern.isEmpty()) continue;` -> 중괄호 `{}` 추가.
*   **L159-L162**: 변수명 `sha256_HMAC` -> `sha256Hmac`으로 변경.

```java
// L104 수정 전
if (trimmedPattern.isEmpty()) continue;

// L104 수정 후
if (trimmedPattern.isEmpty()) {
    continue;
}
```

```java
// L159-L162 수정 전
Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
sha256_HMAC.init(secretKeySpec);
byte[] hashBytes = sha256_HMAC.doFinal(payload.getBytes(StandardCharsets.UTF_8));

// L159-L162 수정 후
Mac sha256Hmac = Mac.getInstance("HmacSHA256");
SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
sha256Hmac.init(secretKeySpec);
byte[] hashBytes = sha256Hmac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
```

#### [MODIFY] `SecurityUtil.java` ([SecurityUtil.java](file:///home/kdy987/work/aman/backend/src/main/java/kr/co/kfs/aman/util/SecurityUtil.java))
*   **L46**: `if (plainText == null) return null;` -> 중괄호 `{}` 추가.
*   **L69**: `if (encryptedBase64 == null) return null;` -> 중괄호 `{}` 추가.

```java
// L46 수정 후
if (plainText == null) {
    return null;
}
```

```java
// L69 수정 후
if (encryptedBase64 == null) {
    return null;
}
```

---

## 3. Verification Plan

### Automated Tests
*   백엔드 루트 디렉토리(`/home/kdy987/work/aman/backend`)에서 아래 명령어로 자바 컴파일 및 Checkstyle 정적 검사를 빌드 검증합니다.
    ```bash
    ./gradlew compileJava
    ```
*   사용자 환경에서 Checkstyle 린트 태스크(예: `./gradlew checkstyleMain`)를 실행하여 4개의 warning이 모두 사라졌음을 확인합니다.
