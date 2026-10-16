from pathlib import Path

p=Path('admin-garapon-event-test.js')
s=p.read_text(encoding='utf-8')
s=s.replace("'\\\"':'&quot'", "'\\\"':'&quot;'")
s=s.replace(
    "renderSelectedState(event);renderEventList();void refreshDashboard(true);",
    "renderSelectedState(event);renderEventList();void refreshDashboard(false);",
)
old="""    const data=await rpc('admin_get_garapon_dashboard',{p_event_id:selectedId||null});if(!data?.ok)throw new Error(data?.error||'dashboard');dashboardData=data;renderFeature(data);
    if(selectedId){const event=data.events?.[0];if(event){events=events.map(x=>x.id===event.id?event:x);if(!keepForm)loadEventFieldsOnly(event);balls=(data.balls||[]).map((x,i)=>({...x,count:x.initial_count,sort_order:i+1}));renderBalls();renderSelectedState(event)}renderOperational(data)}
"""
new="""    const data=await rpc('admin_get_garapon_dashboard',{p_event_id:selectedId||null});if(!data?.ok)throw new Error(data?.error||'dashboard');dashboardData=data;if(!keepForm)renderFeature(data);
    if(selectedId){
      const event=data.events?.[0];
      if(event){
        events=events.map(x=>x.id===event.id?event:x);
        if(!keepForm){
          loadEventFieldsOnly(event);
          balls=(data.balls||[]).map((x,i)=>({...x,count:x.initial_count,sort_order:i+1}));
          renderBalls();
        }
        renderSelectedState(event);
      }
      renderOperational(data);
    }
"""
if old not in s:
    raise SystemExit('refreshDashboard anchor not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
