import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { CmsPlacement, CmsResolvedBlock, CmsResolvedItem, getCmsPlacement } from '../lib/cms';

const ROOT = 'https://funypin.kr/';
const abs = (value?: string | null) => !value ? null : /^https?:\/\//i.test(value) ? value : ROOT + value.replace(/^\//, '');
const first = (obj: any, keys: string[]) => keys.map(k => obj?.[k]).find(v => typeof v === 'string' && v.trim()) || '';

function Item({ item }: { item: CmsResolvedItem }) {
  const source: any = item.shop || item.content || item;
  const title = first(source, ['title', 'name', 'shop_name']);
  const body = first(source, ['summary', 'description', 'body', 'subtitle']);
  const image = abs(first(source, ['image_url', 'thumbnail_url', 'image', 'storage_path']));
  const url = first(source, ['link_url', 'url', 'external_url', 'instagram_url']);
  const content = <View style={{backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:'#eee',overflow:'hidden'}}>
    {image ? <Image source={{uri:image}} style={{width:'100%',aspectRatio:16/9,backgroundColor:'#f3f3f3'}} resizeMode="cover"/> : null}
    <View style={{padding:14}}>
      {title ? <Text style={{fontSize:16,fontWeight:'800',color:'#151515'}}>{title}</Text> : null}
      {body ? <Text style={{marginTop:title?6:0,fontSize:14,lineHeight:20,color:'#666'}} numberOfLines={3}>{body}</Text> : null}
    </View>
  </View>;
  return url ? <Pressable onPress={()=>Linking.openURL(url)}>{content}</Pressable> : content;
}

function Block({ block }: { block: CmsResolvedBlock }) {
  const title = first(block, ['title', 'name']);
  const horizontal = ['carousel','slider','banner','card_slider'].includes(String(block.block_type || '').toLowerCase());
  return <View style={{marginBottom:26}}>
    {title ? <Text style={{fontSize:20,fontWeight:'900',marginBottom:12,color:'#111'}}>{title}</Text> : null}
    {horizontal ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12}}>{block.items.map(item=><View key={item.id} style={{width:286}}><Item item={item}/></View>)}</ScrollView> : <View style={{gap:12}}>{block.items.map(item=><Item key={item.id} item={item}/>)}</View>}
  </View>;
}

export default function CmsRenderer({ placement, emptyText='등록된 콘텐츠가 없습니다.' }: { placement: CmsPlacement; emptyText?: string }) {
  const [blocks,setBlocks]=useState<CmsResolvedBlock[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setBlocks(await getCmsPlacement(placement));}catch(e:any){setError(e?.message || '콘텐츠를 불러오지 못했습니다.');}finally{setLoading(false);}},[placement]);
  useEffect(()=>{load();},[load]);
  if(loading) return <View style={{padding:28,alignItems:'center'}}><ActivityIndicator/><Text style={{marginTop:10,color:'#777'}}>콘텐츠 불러오는 중...</Text></View>;
  if(error) return <View style={{padding:20,backgroundColor:'#fff4f4',borderRadius:14}}><Text style={{color:'#a33'}}>{error}</Text><Pressable onPress={load} style={{marginTop:10}}><Text style={{fontWeight:'800'}}>다시 시도</Text></Pressable></View>;
  if(!blocks.length) return <Text style={{paddingVertical:24,color:'#888'}}>{emptyText}</Text>;
  return <View>{blocks.map(block=><Block key={block.id} block={block}/>)}</View>;
}
