#!/bin/bash
set -e

# Resolve scripting and root paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "=========================================================="
echo " Starting Markdown-to-HTML Parser Equivalence Test Suite"
echo "=========================================================="

# 1. Create results folder
mkdir -p "$SCRIPT_DIR/results"

# 2. Ensure tools dependencies are installed
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "[Init] Installing npm dependencies for testing tools..."
    (cd "$SCRIPT_DIR" && npm install)
else
    echo "[Init] Tools dependencies: OK"
fi

# 3. Compile backend Java source code to ensure MarkdownParserCLI is built
echo "[Init] Compiling Java Backend..."
(cd "$ROOT_DIR/backend" && ./gradlew compileJava)

# 4. Run the comparison test script
echo "[Test] Executing comparison test runner..."
node "$SCRIPT_DIR/compare-markdown-rendering.mjs"
