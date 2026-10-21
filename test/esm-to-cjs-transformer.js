const ts = require('typescript');

/**
 * Jest still runs this project as CommonJS. NestJS 12 ships ESM, so e2e tests
 * downlevel those packages before loading them.
 */
module.exports = {
  process(sourceText, sourcePath) {
    let prepared = sourceText.replace(/import\.meta\.url/g, '__filename');
    // Jest's CJS wrapper already binds `require`, so a second `const require` is a syntax error.
    if (/const require = createRequire\(__filename\);/.test(prepared)) {
      prepared = prepared
        .replace(
          'const require = createRequire(__filename);',
          'const nestRequire = createRequire(__filename);',
        )
        .replace(/\brequire\(/g, 'nestRequire(');
    }
    const result = ts.transpileModule(prepared, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
        esModuleInterop: true,
      },
      fileName: sourcePath,
    });

    return { code: result.outputText };
  },
};
