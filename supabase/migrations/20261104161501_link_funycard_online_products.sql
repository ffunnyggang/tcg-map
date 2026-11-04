update public.graded_products set online_shop_id=(select id from public.online_shops where slug='funycard') where is_sample and seller_name='퍼니카드' and shop_id is null and online_shop_id is null;
