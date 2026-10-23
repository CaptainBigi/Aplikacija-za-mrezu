import zipfile, os

files_to_add = [
    'server.js', 'start.bat', 'install_startup.bat', 'PROVERA_SISTEMA.bat', 'KORISNICKO_UPUTSTVO.txt',
    'data.json', 'netscan-data.json', 'package.json', 'metadata.json', 'index.html'
]

os.makedirs('public', exist_ok=True)
zip_path = 'public/NET-SCAN-OFFLINE.zip'
if os.path.exists(zip_path):
    os.remove(zip_path)

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files_to_add:
        if os.path.exists(f):
            z.write(f, f)
    for root, dirs, files in os.walk('dist'):
        for file in files:
            full_path = os.path.join(root, file)
            # Skip nested zip file inside dist
            if file.endswith('.zip'):
                continue
            z.write(full_path, full_path)

import shutil
if os.path.exists('dist'):
    shutil.copyfile(zip_path, 'dist/NET-SCAN-OFFLINE.zip')

print('NET-SCAN-OFFLINE.zip updated successfully:', os.path.getsize(zip_path))
