const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const ignoreDirs = ['node_modules', 'build', 'dist', 'public', 'scripts'];
const ignoreExtensions = ['.md', '.json', '.env', '.gitignore'];

// Get all files in the source directory
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (!ignoreExtensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Check if a file is imported anywhere
function isFileImported(filePath) {
  try {
    // Windows-friendly approach using PowerShell
    const normalizedPath = filePath.replace(/\\/g, '/');
    const relativePath = path.relative(srcDir, filePath).replace(/\\/g, '/');
    const fileName = path.basename(filePath, path.extname(filePath));
    
    const patterns = [
      `import .* from ['"].*${fileName}['"]`,
      `require\\(['"].*${fileName}['"]\\)`
    ];
    
    // Use PowerShell's Select-String instead of grep
    const psCommand = `powershell "Get-ChildItem -Path '${srcDir}' -Recurse -Include *.js,*.jsx,*.ts,*.tsx | Select-String -Pattern '${patterns.join('|')}' | Measure-Object | Select-Object -ExpandProperty Count"`;
    const result = execSync(psCommand).toString().trim();
    
    return parseInt(result) > 0;
  } catch (error) {
    console.error(`Error checking imports for ${filePath}:`, error.message);
    return false;
  }
}

// Entry React components might not be imported directly
function isEntryComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes('ReactDOM.render') || 
         content.includes('createRoot') ||
         filePath.includes('index.js') ||
         filePath.includes('App.js');
}

// Main function
function findUnusedFiles() {
  console.log('Scanning for unused files...');
  const allFiles = getAllFiles(srcDir);
  const unusedFiles = [];
  
  allFiles.forEach(filePath => {
    if (!isFileImported(filePath) && !isEntryComponent(filePath)) {
      unusedFiles.push(filePath);
    }
  });
  
  console.log(`Found ${unusedFiles.length} potentially unused files:`);
  unusedFiles.forEach(file => {
    console.log(`- ${path.relative(rootDir, file)}`);
  });
}

findUnusedFiles();
