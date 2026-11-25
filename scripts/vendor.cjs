const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'vendor');fs.mkdirSync(dir,{recursive:true});
const entries={
 'three.module.js':'three/build/three.module.js',
 'd3.min.js':'d3/dist/d3.min.js',
 'sora-700.woff2':'@fontsource/sora/files/sora-latin-700-normal.woff2',
 'dm-sans-400.woff2':'@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2',
 'dm-sans-700.woff2':'@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2',
 'ibm-plex-mono-400.woff2':'@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2'
};
for(const [dest,src] of Object.entries(entries))fs.copyFileSync(path.join(root,'node_modules',src),path.join(dir,dest));
const licenses=path.join(dir,'licenses');fs.mkdirSync(licenses,{recursive:true});
for(const name of ['three','d3','@fontsource/sora','@fontsource/dm-sans','@fontsource/ibm-plex-mono']){
 const base=path.join(root,'node_modules',name);
 for(const file of fs.readdirSync(base).filter(f=>/^(license|ofl|notice)(\.|$)/i.test(f)))fs.copyFileSync(path.join(base,file),path.join(licenses,name.replace(/[@/]/g,'_')+'-'+file));
}
console.log('Recursos locales preparados:',Object.keys(entries).length);
