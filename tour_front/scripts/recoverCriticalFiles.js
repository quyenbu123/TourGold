const fs = require('fs');
const path = require('path');

// Essential files that should never be deleted
const criticalFiles = [
  // Core React files
  'src/App.css',
  'src/index.css',
  'src/reportWebVitals.js',
  'src/logo.svg',
  
  // Essential components
  'src/components/common/LoadingSpinner.js',
  'src/components/common/ProtectedRoute.js',
  'src/components/common/ErrorBoundary.js',
  
  // Authentication and context
  'src/context/AuthContext.js',
  
  // Core services
  'src/services/api.js',
  'src/services/authService.js',
  'src/services/tourService.js',
  'src/services/bookingService.js',
  'src/services/userService.js',
  
  // Utility functions
  'src/utils/jwtUtils.js',
  'src/utils/helpers.js',
  
  // Page components
  'src/pages/HomePage.js',
  'src/pages/TourDetailPage.js',
  'src/pages/TourListPage.js',
  'src/pages/auth/LoginPage.js',
  'src/pages/auth/RegisterPage.js'
];

function checkMissingFiles() {
  const rootDir = path.resolve(__dirname, '..');
  const missingFiles = [];
  
  criticalFiles.forEach(filePath => {
    const fullPath = path.join(rootDir, filePath);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(filePath);
    }
  });
  
  return missingFiles;
}

// Look for backup directory
function findBackups() {
  const rootDir = path.resolve(__dirname, '..');
  const backupDir = path.join(rootDir, 'backup-unused-files');
  
  if (fs.existsSync(backupDir)) {
    console.log('✅ Backup directory found at:', backupDir);
    const backupFiles = fs.readdirSync(backupDir);
    console.log(`Found ${backupFiles.length} backup files`);
    return backupDir;
  } else {
    console.log('❌ No backup directory found. Checking for other backups...');
    return null;
  }
}

// Main function
function suggestRecoverySteps() {
  console.log('TOUR APP RECOVERY ASSISTANT');
  console.log('==========================\n');
  
  const missingFiles = checkMissingFiles();
  const backupDir = findBackups();
  
  if (missingFiles.length === 0) {
    console.log('Good news! All critical files appear to be present.');
    console.log('Your errors might be related to other missing files or code dependencies.');
  } else {
    console.log(`❌ Found ${missingFiles.length} missing critical files:\n`);
    missingFiles.forEach(file => console.log(`- ${file}`));
    
    console.log('\nRECOVERY SUGGESTIONS:');
    
    if (backupDir) {
      console.log('\n1. Restore from backups:');
      missingFiles.forEach(file => {
        const fileName = path.basename(file);
        const backupPath = path.join(backupDir, fileName);
        const targetDir = path.join(path.resolve(__dirname, '..'), path.dirname(file));
        
        if (fs.existsSync(backupPath)) {
          console.log(`✅ Found backup for ${file}`);
          console.log(`   Run: mkdir -p "${targetDir}" && copy "${backupPath}" "${path.join(path.resolve(__dirname, '..'), file)}"`);
        } else {
          console.log(`❌ No backup found for ${file}`);
        }
      });
    }
    
    console.log('\n2. Download missing files from repository:');
    console.log('   If you have a GitHub/GitLab repository, download the missing files from there');
    
    console.log('\n3. Recreate files:');
    console.log('   For React files like App.css, you can recreate them with standard content');
  }
  
  console.log('\nADDITIONAL TIPS:');
  console.log('1. Run "npm install" to ensure all dependencies are installed');
  console.log('2. Check your package.json for any missing dependencies');
  console.log('3. Clear cache with "npm cache clean --force" if needed');
}

suggestRecoverySteps();
