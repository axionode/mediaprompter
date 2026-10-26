from pathlib import Path
import struct, shutil, json, sys
ROOT=Path(__file__).resolve().parents[1]
PREFIX=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'work/msys64/ucrt64'
SOURCE=ROOT/'native/uxplay'
DEST=ROOT/'runtime/receiver'
DEST.mkdir(parents=True,exist_ok=True)
def imports(file):
    data=file.read_bytes()
    pe=struct.unpack_from('<I',data,0x3c)[0]
    sections=struct.unpack_from('<H',data,pe+6)[0]
    optional_size=struct.unpack_from('<H',data,pe+20)[0]
    optional=pe+24
    magic=struct.unpack_from('<H',data,optional)[0]
    directory=optional+(112 if magic==0x20b else 96)
    import_rva=struct.unpack_from('<I',data,directory+8)[0]
    section_start=optional+optional_size
    entries=[]
    for i in range(sections):
        p=section_start+i*40
        vs,va,raw_size,raw=struct.unpack_from('<IIII',data,p+8)
        entries.append((va,max(vs,raw_size),raw))
    def offset(rva):
        for va,size,raw in entries:
            if va<=rva<va+size:return raw+rva-va
        return rva
    names=[]
    if not import_rva:return names
    p=offset(import_rva)
    while any(data[p:p+20]):
        name_rva=struct.unpack_from('<I',data,p+12)[0]
        n=offset(name_rva); end=data.index(b'\0',n)
        names.append(data[n:end].decode('ascii'));p+=20
    return names
queue=[]
def copy(source,target):
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(source,target);queue.append(source)
copy(ROOT/'work/native-build/uxplay.exe',DEST/'uxplay.exe')
for exe in ['gst-launch-1.0.exe','gst-inspect-1.0.exe']:copy(PREFIX/'bin'/exe,DEST/exe)
scanner=PREFIX/'libexec/gstreamer-1.0/gst-plugin-scanner.exe'
copy(scanner,DEST/'libexec/gstreamer-1.0/gst-plugin-scanner.exe')
plugins=['libav','coreelements','autodetect','app','typefindfunctions','playback','videoconvertscale','videoparsersbad','openh264','jpeg','multipart','tcp','videotestsrc','audioparsers','audioconvert','audioresample','faad']
for name in plugins:
    source=PREFIX/'lib/gstreamer-1.0'/('libgst'+name+'.dll')
    if source.exists():copy(source,DEST/'lib/gstreamer-1.0'/source.name)
seen=set();dlls={p.name.lower():p for p in (PREFIX/'bin').glob('*.dll')}
while queue:
    file=queue.pop()
    if file.name.lower() in seen:continue
    seen.add(file.name.lower())
    for name in imports(file):
        source=dlls.get(name.lower())
        if source and not (DEST/source.name).exists():copy(source,DEST/source.name)
(DEST/'receiver.conf').write_text('# Mediaprompter: no recording or persistent pairing.\n',encoding='utf8')
lic=ROOT/'licenses';lic.mkdir(exist_ok=True)
shutil.copy2(SOURCE/'LICENSE',lic/'GPL-3.0.txt')
for name in ['gstreamer','gst-plugins-base','gst-plugins-good','gst-plugins-bad','openh264','openssl','libplist','glib2']:
    source=PREFIX/'share/licenses'/name
    if source.exists():shutil.copytree(source,lic/name,dirs_exist_ok=True)

UPSTREAM={'sha':'82ad05ce34ec862851fa6ab1240f50f58fb7fa5a','html_url':'https://github.com/FDH2/UxPlay/commit/82ad05ce34ec862851fa6ab1240f50f58fb7fa5a'}
manifest={'modifications':'Optional libav in explicit video-only OpenH264 mode (patches/uxplay-optional-libav.patch)', 'source':UPSTREAM,'files':sorted(str(p.relative_to(DEST)) for p in DEST.rglob('*') if p.is_file())}
(DEST/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print('Packaged',len(manifest['files']),'files;',round(sum(p.stat().st_size for p in DEST.rglob('*') if p.is_file())/1024**2,1),'MiB')
