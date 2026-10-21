import MyWebPage from '../../components/MyWebPage';
import { useAppLanguage } from '../../lib/i18n';
export default function Screen(){const {language}=useAppLanguage();return <MyWebPage path="my-coupons.html" title={language==='en'?'Coupons':'쿠폰함'}/>;}
