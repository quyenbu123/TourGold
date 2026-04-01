const fs = require('fs');
const path = require('path');

// Files that are likely safe to remove
const filesToRemove = [
  // Duplicate layouts (keep one version)
  'src/components/AdminLayout.js', // Duplicate of layouts/AdminLayout.js
  'src/components/Layout.js',      // Duplicate of layouts/Layout.js
  
  // Testing/development files
  'src/utils/mockApiService.js',
  'src/utils/toastifyMock.js',
  'src/pages/TestPaymentPage.js',
  
  // Unused DTOs (Data Transfer Objects)
  'src/dto/ServiceDTO.js',
  'src/dto/TourDTO.js',
  
  // Unused CSS that should be merged
  'src/pages/admin/AdminPromotionsPage.css',
  
  // Legacy files
  'src/logo.svg' // If not using the React logo
];

// Function to safely remove files
function safelyRemoveFiles() {
  const rootDir = path.resolve(__dirname, '..');
  
  filesToRemove.forEach(filePath => {
    const fullPath = path.join(rootDir, filePath);
    
    if (fs.existsSync(fullPath)) {
      // Create a backup first
      const backupDir = path.join(rootDir, 'backup-unused-files');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const fileName = path.basename(filePath);
      const backupPath = path.join(backupDir, fileName);
      
      fs.copyFileSync(fullPath, backupPath);
      console.log(`Backed up: ${filePath} to ${backupPath}`);
      
      // Now remove the file
      fs.unlinkSync(fullPath);
      console.log(`Removed: ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
    }
  });
  
  console.log(`\nCompleted! Removed ${filesToRemove.length} unused files.`);
  console.log(`Backups stored in the 'backup-unused-files' directory.`);
}

// Ask for confirmation before running
console.log('This script will remove the following files:');
filesToRemove.forEach(file => console.log(`- ${file}`));
console.log('\nPlease confirm by typing "yes" to proceed:');

process.stdin.once('data', (data) => {
  const input = data.toString().trim().toLowerCase();
  if (input === 'yes') {
    safelyRemoveFiles();
  } else {
    console.log('Operation cancelled.');
  }
  process.exit();
});
