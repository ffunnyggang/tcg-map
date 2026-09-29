import { useState } from 'react';
import { Pressable,SafeAreaView,ScrollView,Text,View } from 'react-native';
import CmsRenderer from '../../components/CmsRenderer';
import type { CmsPlacement } from '../../lib/cms';

const tabs:{label:string;placement:CmsPlacement}[]=[
  {label:'정보',placement:'pick_information'},
  {label:'일정',placement:'pick_schedule'},
  {label:'CREATOR',placement:'pick_creator'},
  {label:'깽퐌커플 리뷰',placement:'pick_review'},
];

export default function Pick(){
  const [active,setActive]=useState(0); const current=tabs[active];
  return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
    <View style={{paddingHorizontal:20,paddingTop:16}}><Text style={{fontSize:24,fontWeight:'800'}}>PICK</Text></View>
    <View style={{borderBottomWidth:1,borderBottomColor:'#eee'}}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:14,paddingTop:14}}>
        {tabs.map((tab,index)=><Pressable key={tab.placement} onPress={()=>setActive(index)} style={{paddingHorizontal:10,paddingVertical:12,borderBottomWidth:2,borderBottomColor:index===active?'#111':'transparent'}}><Text style={{fontWeight:index===active?'800':'500',color:index===active?'#111':'#888'}}>{tab.label}</Text></Pressable>)}
      </ScrollView>
    </View>
    <ScrollView key={current.placement} contentContainerStyle={{padding:20,paddingBottom:44}}>
      <CmsRenderer placement={current.placement}/>
    </ScrollView>
  </SafeAreaView>;
}
