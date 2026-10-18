from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "components" / "FunyWebView.tsx"
text = PATH.read_text(encoding="utf-8")


def replace_once(old: str, new: str, marker: str) -> None:
    global text
    # The final QA workflow can run repeatedly. Once the marker exists, leave the
    # validated source untouched instead of reapplying a prefix-based replacement.
    if marker in text:
        return
    if old not in text:
        raise RuntimeError(f"Missing hardening anchor: {marker}")
    text = text.replace(old, new, 1)


replace_once(
    "        var anchor=target.closest('a[href]');\n",
    "        var marketBack=target.closest('#marketDetailBack');\n"
    "        var appContext=window.__FUNY_APP_CONTEXT||{};\n"
    "        if(marketBack&&/\\/shops\\.html$/i.test(location.pathname)&&appContext.surface==='page'){\n"
    "          event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();\n"
    "          earlyPost({type:'NATIVE_BACK'});\n"
    "          return false;\n"
    "        }\n"
    "        var anchor=target.closest('a[href]');\n",
    "target.closest('#marketDetailBack')",
)

replace_once(
    "        var href=node.href||node.getAttribute('href')||'',fileName=node.getAttribute('download')||('FUNY-PIN-'+Date.now()+'.jpg');if(!href)return;\n"
    "        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();\n",
    "        var href=node.href||node.getAttribute('href')||'',fileName=node.getAttribute('download')||('FUNY-PIN-'+Date.now()+'.jpg');if(!href)return;\n"
    "        var imageDownload=/\\.(?:png|jpe?g|webp)$/i.test(fileName)||/^data:image\\//i.test(href);if(!imageDownload)return;\n"
    "        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();\n",
    "var imageDownload=",
)

replace_once(
    "  const isTalkPost=(()=>{try{const u=new URL(currentTarget);return /\\/talk\\.html$/.test(u.pathname.toLowerCase())&&/^#\\/post\\//.test(u.hash)}catch{return false}})();\n",
    "  const isTalkPost=(()=>{try{const u=new URL(currentTarget);return /\\/talk\\.html$/.test(u.pathname.toLowerCase())&&/^#\\/post\\//.test(u.hash)}catch{return false}})();\n"
    "  const isMarketDetail=(()=>{try{const u=new URL(currentTarget);return /\\/shops\\.html$/.test(u.pathname.toLowerCase())&&/^#market\\//.test(u.hash)}catch{return false}})();\n",
    "const isMarketDetail=",
)

replace_once(
    "    {showBackHeader?<FunyHeader title={backOnlyHeader?'':pageTitleFromUrl(currentTarget,backTitle||title)}",
    "    {showBackHeader&&!isMarketDetail?<FunyHeader title={backOnlyHeader?'':pageTitleFromUrl(currentTarget,backTitle||title)}",
    "showBackHeader&&!isMarketDetail?",
)

replace_once(
    "if(data?.type==='NATIVE_BACK'){setWebOverlayOpen(false);router.back();return;}",
    "if(data?.type==='NATIVE_BACK'){setWebOverlayOpen(false);if(router.canGoBack())router.back();else router.replace('/account');return;}",
    "if(router.canGoBack())router.back();else router.replace('/account')",
)

required = [
    "target.closest('#marketDetailBack')",
    "var imageDownload=",
    "const isMarketDetail=",
    "showBackHeader&&!isMarketDetail?",
    "if(router.canGoBack())router.back();else router.replace('/account')",
]
missing = [marker for marker in required if marker not in text]
if missing:
    raise RuntimeError("Missing hardening markers: " + ", ".join(missing))

PATH.write_text(text, encoding="utf-8")
print("Scoped WebView bridge hardening applied.")
