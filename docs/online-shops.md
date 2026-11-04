# Online shop management

- Admin: /admin-online-shops.html, linked under 카드샵 on desktop and mobile admin navigation.
- Full admins can create/edit name, optional display address/region, HTTPS shopping/contact URLs and operating status. There is no hard-delete UI. Updates compare updated_at to avoid overwriting another edit.
- online_shops is independent of physical shops. Online records never enter the TCG MAP shop table or map views.
- graded_products.online_shop_id references online_shops. A product cannot simultaneously reference physical and online shops.
- Public reads include active online shops and active products from active online shops. Full admins can read disabled shops/products. Normal users cannot create/update shops.
- Online graded-card manager assignments are held in graded_online_shop_managers. Permission UI stays at /admin-box-permissions.html. Existing physical assignments remain unchanged.
- graded-shop-admin uses online:<uuid> as its seller scope at the API boundary and converts it to online_shop_id in draft/product storage. Database RPCs recheck current assignment and shop status.
- Registration shows each assigned shop automatically. Full admins can use ?shop=online:<uuid> to open a linked shop directly; the bootstrap shop allowlist still applies.
- Online product detail displays the online shop record and optional website, without a physical location map.
- funycard / 퍼니카드 is registered with display region 서울 용산구. Website and contact URLs remain null until supplied.
- Existing sample records remain samples with their original prices/cert numbers/favorites; a separate seed migration links them to funycard and removes legacy copied seller fields.
- QA: node tools/check-online-shops.cjs; tools/qa-online-shops.sql runs in one rollback transaction. Existing registration/permission tests remain applicable.
- Rollback: hide the online admin links, keep the nullable foreign keys and online shop rows, and preserve sample product linkage. Do not delete user products or shop records.
