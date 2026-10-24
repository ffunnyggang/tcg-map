# Binder spreads and TALK entry

- Overview/editor spreads use rounded outer corners, equal 10px sheet padding, external page numbers, and separate editor menu placement.
- Overview directional highlights and central fold remain noninteractive overlays, retaining original image sizing and lazy loading.
- TALK normal navigation and reload start at All/top; history traversal reads entry-specific state, with existing BFCache handling retained.
- Browser tests cover fresh entry, stale stored state, reload, binder-detail back, equal margins, external numbering, mobile width, image gallery and menu regression.
- Native retained TALK tabs require the separate mobile menu-entry change; web deployment alone cannot intercept native tab presses.
