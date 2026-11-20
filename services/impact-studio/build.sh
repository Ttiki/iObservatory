#!/bin/sh
set -eu

cd "$(dirname "$0")"

rm -rf build/classes build/test-classes
mkdir -p build/classes build/test-classes

# Compile the application for Java 21.
find src/main/java -name '*.java' > build/sources.txt
javac --release 21 -encoding UTF-8 \
  -d build/classes @build/sources.txt

# Bundle the frontend alongside the compiled Java classes.
cp -R src/main/resources/. build/classes/

cat > build/MANIFEST.MF <<'EOF'
Manifest-Version: 1.0
Main-Class: com.clementcombier.studio.Main
Class-Path: ../lib/postgresql-42.7.14.jar

EOF

jar --create \
  --file build/impact-studio.jar \
  --manifest build/MANIFEST.MF \
  -C build/classes .

if [ "${1:-}" = "test" ]; then
  find src/test/java -name '*.java' > build/tests.txt

  javac --release 21 -encoding UTF-8 \
    -cp build/classes \
    -d build/test-classes @build/tests.txt

  java -cp build/classes:build/test-classes \
    com.clementcombier.studio.CompilerTest
fi