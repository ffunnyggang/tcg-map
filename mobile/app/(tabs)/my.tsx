import { useEffect,useState } from 'react';
import Account from '../account';
import { subscribeTabReselect } from '../../lib/tabReselect';

export default function MyTab(){
  const [reloadKey,setReloadKey]=useState(0);
  useEffect(()=>subscribeTabReselect('my',()=>setReloadKey(v=>v+1)),[]);
  return <Account key={reloadKey}/>;
}
