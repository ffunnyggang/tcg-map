import { useState } from 'react';
import { Pressable,ScrollView,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CmsRenderer from '../../components/CmsRenderer';
import FunyHeader from '../../components/FunyHeader';
import type { CmsPlacement } from '../../lib/cms';
import { C } from '../../lib/theme';

const tabs:{label:string;placement:CmsPlacement}[]=[
  {label:'정보',placement:'pick_information'},
  {label:'일정',placement:'pick_schedule'},
  {label:'CREATOR',placement:'pick_creator'},
  {label:'깽퐌커플 리뷰',placement:'pick_review'},
];

export default function Pick(){
  const [active,setActive]=useState(0); const current=tabs[active];
  return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:'#fff'}}>
    <FunyHeader/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow:0,backgroundColor:'#fff'}} contentContainerStyle={{paddingHorizontal:14,paddingTop:14,paddingBottom:10,gap:6}}>
      {tabs.map((tab,index)=>{const on=index===active;return <Pressable key={tab.placement} onPress={()=>setActive(index)} style={{paddingHorizontal:11,paddingVertical:9,borderRadius:999,borderWidth:1,borderColor:on?'#272331':'#E5E1EB',backgroundColor:on?'#272331':'#fff'}}><Text style={{fontWeight:'700',color:on?'#fff':'#716B79',fontSize:12}}>{tab.label}</Text></Pressable>})}
    </ScrollView>
    <ScrollView key={current.placement} contentContainerStyle={{paddingHorizontal:14,paddingTop:0,paddingBottom:118,backgroundColor:'#fff'}} showsVerticalScrollIndicator={false}>
      <CmsRenderer placement={current.placement}/>
    </ScrollView>
  </SafeAreaView>;
}
