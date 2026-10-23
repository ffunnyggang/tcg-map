StPageFlip / page-flip 2.0.7, MIT, https://github.com/Nodlik/StPageFlip
Bundle: https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js
Local lifecycle patch: retain/cancel the render RAF on destroy; always remove UI
handlers (including resize) when custom pointer input disables useMouseEvents.
No physics or visual changes to the upstream engine.
