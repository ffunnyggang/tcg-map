const fs=require('fs');
(async()=>{
 const response=await fetch('http://127.0.0.1:8083',{headers:{'expo-platform':'android',accept:'application/expo+json'},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Manifest HTTP '+response.status);
 const manifest=await response.json();
 const bundleURL=manifest.launchAsset?.url;
 if(!bundleURL)throw Error('Manifest has no launch asset');
 const bundle=await fetch(bundleURL,{signal:AbortSignal.timeout(180000)});
 const text=await bundle.text();
 if(!bundle.ok){console.error(text.slice(0,2000));throw Error('Android JS bundle HTTP '+bundle.status);}
 if(!text.includes('funy:talk-reselect'))throw Error('Missing TALK reselect in Android bundle');
 if(!text.includes('ensureAndroidNotificationChannel'))throw Error('Missing Android notification channel in bundle');
 console.log('PASS Android Metro manifest and JS bundle: '+Buffer.byteLength(text)+' bytes (no APK/AAB generated).');
})().catch(error=>{console.error(error);process.exitCode=1});
