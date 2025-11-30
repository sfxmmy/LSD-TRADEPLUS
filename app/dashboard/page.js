'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'

function getDaysAgo(d){if(!d)return'N/A';const today=new Date(),date=new Date(d);if(isNaN(date.getTime()))return'N/A';const diff=Math.floor((today-date)/(1000*60*60*24));return diff===0?'Today':diff===1?'1d ago':`${diff}d ago`}
function formatDate(d){if(!d)return'N/A';const date=new Date(d);return isNaN(date.getTime())?'N/A':date.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}

function StarRating({rating}){if(rating==null)return<span style={{color:'#666',fontSize:'11px'}}>N/A</span>;const stars=[];for(let i=1;i<=5;i++){if(rating>=i)stars.push(<svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>);else if(rating>=i-0.5)stars.push(<svg key={i} width="12" height="12" viewBox="0 0 24 24"><defs><linearGradient id={`h${i}${rating}`}><stop offset="50%" stopColor="#fff"/><stop offset="50%" stopColor="#333"/></linearGradient></defs><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={`url(#h${i}${rating})`}/></svg>);else stars.push(<svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#333"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}return<div style={{display:'flex',gap:'1px'}}>{stars}</div>}
function PencilIcon({size=12}){return<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
function ImageIcon(){return<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}

function Chart({data,isPositive,accountId}){
  const [tooltip,setTooltip]=useState(null)
  if(!data||data.length<2)return<div style={{width:'100%',height:'100%',background:'#0a0a0f',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',color:'#555'}}>No data yet</div>
  const values=data.map(d=>d.value),max=Math.max(...values),min=Math.min(...values),range=max-min||1
  const width=700,height=280,pL=45,pB=35,pT=10,pR=15,cW=width-pL-pR,cH=height-pT-pB
  const points=data.map((d,i)=>({x:pL+(i/(data.length-1))*cW,y:pT+(1-(d.value-min)/range)*cH,value:d.value,date:d.date}))
  let pathD=points.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')
  const fillD=pathD+` L ${points[points.length-1].x} ${pT+cH} L ${pL} ${pT+cH} Z`
  const color=isPositive?'#22c55e':'#ef4444'
  const handleMouseMove=(e)=>{const rect=e.currentTarget.getBoundingClientRect(),mouseX=((e.clientX-rect.left)/rect.width)*width;let closest=points[0],closestDist=Math.abs(mouseX-closest.x);for(const p of points){const dist=Math.abs(mouseX-p.x);if(dist<closestDist){closest=p;closestDist=dist}}if(closestDist<40)setTooltip({x:closest.x,y:closest.y,value:closest.value,date:closest.date});else setTooltip(null)}
  return(<div style={{position:'relative',width:'100%',height:'100%'}}><svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{display:'block',cursor:'crosshair'}} onMouseMove={handleMouseMove} onMouseLeave={()=>setTooltip(null)}><defs><linearGradient id={`cg${accountId}${isPositive}`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>{[0,1,2,3,4].map(i=><line key={i} x1={pL} y1={pT+(i/4)*cH} x2={width-pR} y2={pT+(i/4)*cH} stroke="#1a1a22" strokeWidth="1"/>)}<text x={pL-8} y={pT+5} fill="#aaa" fontSize="11" textAnchor="end">${max}</text><text x={pL-8} y={pT+cH/2+4} fill="#aaa" fontSize="11" textAnchor="end">${Math.round((max+min)/2)}</text><text x={pL-8} y={pT+cH+4} fill="#aaa" fontSize="11" textAnchor="end">${min}</text>{data.map((d,i)=>{if(i%2===0||i===data.length-1){const x=pL+(i/(data.length-1))*cW;return<text key={i} x={x} y={height-8} fill="#aaa" fontSize="10" textAnchor="middle">{d.date}</text>}return null})}<line x1={pL} y1={pT} x2={pL} y2={pT+cH} stroke="#2a2a35" strokeWidth="1"/><line x1={pL} y1={pT+cH} x2={width-pR} y2={pT+cH} stroke="#2a2a35" strokeWidth="1"/><path d={fillD} fill={`url(#cg${accountId}${isPositive})`}/><path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>{tooltip&&<><line x1={tooltip.x} y1={pT} x2={tooltip.x} y2={pT+cH} stroke={color} strokeWidth="1" strokeDasharray="4" opacity="0.5"/><circle cx={tooltip.x} cy={tooltip.y} r="5" fill={color} stroke="#0a0a0f" strokeWidth="2"/></>}</svg>{tooltip&&<div style={{position:'absolute',left:`${(tooltip.x/width)*100}%`,top:`${(tooltip.y/height)*100-12}%`,transform:'translate(-50%,-100%)',background:'#1a1a24',border:'1px solid #2a2a35',borderRadius:'8px',padding:'6px 10px',pointerEvents:'none',zIndex:10,whiteSpace:'nowrap'}}><div style={{fontSize:'11px',color:'#bbb',marginBottom:'2px'}}>{tooltip.date}</div><div style={{fontSize:'13px',fontWeight:600,color:tooltip.value>=0?'#22c55e':'#ef4444'}}>${tooltip.value>=0?'+':''}{tooltip.value}</div></div>}</div>)
}

function AccountCard({account,trades,isPro,onEditName,supabase}){
  const [isEditing,setIsEditing]=useState(false)
  const [editName,setEditName]=useState(account.name)
  const handleSave=async()=>{
    if(editName!==account.name){
      await supabase.from('accounts').update({name:editName}).eq('id',account.id)
      onEditName(account.id,editName)
    }
    setIsEditing(false)
  }
  const wins=trades.filter(t=>t.outcome==='win').length,losses=trades.filter(t=>t.outcome==='loss').length
  const totalPnl=trades.reduce((s,t)=>s+(t.pnl||0),0),winrate=(wins+losses)>0?Math.round((wins/(wins+losses))*100):0
  const totalRR=trades.reduce((s,t)=>s+(t.rr||0),0),avgRR=trades.length>0?(totalRR/trades.length).toFixed(1):'0'
  const profitFactor=losses>0?(wins/losses).toFixed(1):wins>0?'∞':'0'
  const recent=trades.slice(0,5)
  const pnlHistory=trades.length>0?trades.slice().reverse().reduce((acc,t,i)=>{const prev=acc[acc.length-1]?.value||0;acc.push({value:prev+(t.pnl||0),date:formatDate(t.date)});return acc},[{value:0,date:'Start'}]):[{value:0,date:'Start'}]
  
  return(<div style={{background:'#14141a',border:'1px solid #222230',borderRadius:'14px',marginBottom:'24px',overflow:'hidden'}}>
    <div style={{padding:'14px 24px',borderBottom:'1px solid #222230',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
        <div style={{background:'#0a0a0f',border:'1px solid #2a2a35',borderRadius:'8px',padding:'10px 18px',height:'44px',display:'flex',alignItems:'center'}}>
          {isEditing?<input type="text" value={editName} onChange={e=>setEditName(e.target.value)} onBlur={handleSave} onKeyDown={e=>e.key==='Enter'&&handleSave()} autoFocus style={{background:'transparent',border:'none',color:'#fff',fontSize:'17px',fontWeight:700,width:'150px',outline:'none'}}/>:<span style={{fontWeight:700,fontSize:'17px',color:'#fff'}}>{account.name}</span>}
        </div>
        <button onClick={()=>setIsEditing(true)} style={{background:'transparent',border:'none',padding:'6px',cursor:'pointer',color:'#777'}}><PencilIcon size={14}/></button>
      </div>
      <div style={{background:'#0a0a0f',border:'1px solid #2a2a35',borderRadius:'8px',padding:'10px 20px',height:'44px',display:'flex',alignItems:'center',gap:'10px'}}>
        <span style={{color:'#aaa',fontSize:'14px'}}>Balance:</span>
        <span style={{fontWeight:700,fontSize:'19px',color:'#fff'}}>${(account.starting_balance+totalPnl).toLocaleString()}</span>
      </div>
    </div>
    <div style={{padding:'20px'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 220px',gap:'20px',alignItems:'stretch'}}>
        <div style={{background:'#0a0a0f',borderRadius:'10px',padding:'14px',height:'310px'}}><Chart data={pnlHistory} isPositive={totalPnl>=0} accountId={account.id}/></div>
        <div style={{display:'flex',flexDirection:'column',gap:'6px',height:'310px'}}>
          {[{label:'Total PnL',value:`${totalPnl>=0?'+':''}$${totalPnl}`,color:totalPnl>=0?'#22c55e':'#ef4444'},{label:'Winrate',value:`${winrate}%`},{label:'Avg RR',value:`${avgRR}R`},{label:'Profit Factor',value:profitFactor},{label:'Trades',value:trades.length},{label:'Consistency',value:'--'}].map((s,i)=><div key={i} style={{background:'#0a0a0f',borderRadius:'8px',padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',flex:1}}><span style={{fontSize:'13px',color:'#aaa'}}>{s.label}</span><span style={{fontSize:'16px',fontWeight:600,color:s.color||'#fff'}}>{s.value}</span></div>)}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 180px',gap:'20px',marginTop:'16px'}}>
        <div style={{position:'relative'}}>
          <div style={{position:'absolute',top:'-10px',left:'50%',transform:'translateX(-50%)',background:'#14141a',padding:'0 12px',zIndex:1}}><span style={{fontSize:'12px',color:'#bbb',textTransform:'uppercase',letterSpacing:'1px'}}>Recent Trades</span></div>
          <div style={{background:'#0a0a0f',borderRadius:'10px',overflow:'hidden',border:'1px solid #1a1a22'}}>
            <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr 1fr 0.8fr 1.2fr 1fr 1fr',padding:'10px 14px',fontSize:'10px',color:'#888',textTransform:'uppercase',letterSpacing:'0.3px',borderBottom:'1px solid #151518'}}><span>Symbol</span><span>W/L</span><span>PnL</span><span>RR</span><span>Rating</span><span>Placed</span><span>Date</span></div>
            <div style={{maxHeight:'155px',overflowY:'auto'}}>
              {recent.length===0?<div style={{padding:'20px',textAlign:'center',color:'#777',fontSize:'12px'}}>No trades yet</div>:recent.map((t,i)=><div key={t.id} style={{display:'grid',gridTemplateColumns:'1.2fr 1fr 1fr 0.8fr 1.2fr 1fr 1fr',alignItems:'center',padding:'9px 14px',borderBottom:i<recent.length-1?'1px solid #151518':'none',fontSize:'12px'}}>
                <span style={{fontWeight:600,color:'#fff'}}>{t.symbol||'N/A'}</span>
                <span style={{padding:'2px 8px',borderRadius:'4px',fontSize:'10px',fontWeight:600,background:t.outcome==='win'?'rgba(34,197,94,0.15)':t.outcome==='loss'?'rgba(239,68,68,0.15)':'rgba(234,179,8,0.15)',color:t.outcome==='win'?'#22c55e':t.outcome==='loss'?'#ef4444':'#eab308',width:'fit-content'}}>{t.outcome?.toUpperCase()||'N/A'}</span>
                <span style={{fontWeight:600,color:t.pnl>=0?'#22c55e':'#ef4444'}}>{t.pnl!=null?`${t.pnl>=0?'+':''}$${Math.abs(t.pnl)}`:'N/A'}</span>
                <span style={{color:'#bbb'}}>{t.rr!=null?`${t.rr}R`:'N/A'}</span>
                <StarRating rating={t.rating}/>
                <span style={{color:'#aaa',fontSize:'11px'}}>{getDaysAgo(t.date)}</span>
                <span style={{color:'#999',fontSize:'11px'}}>{formatDate(t.date)}</span>
              </div>)}
            </div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <a href={`/account/${account.id}`} style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1,background:'#22c55e',color:'#fff',borderRadius:'10px',textDecoration:'none',fontWeight:700,fontSize:'13px',letterSpacing:'0.5px',padding:'14px 10px'}}>ENTER JOURNAL</a>
          <a href={`/account/${account.id}?tab=statistics`} style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1,background:'#1a1a24',border:'1px solid #2a2a35',color:'#fff',borderRadius:'10px',textDecoration:'none',fontWeight:700,fontSize:'13px',letterSpacing:'0.5px',padding:'14px 10px'}}>STATISTICS</a>
        </div>
      </div>
    </div>
  </div>)
}

export default function Dashboard() {
  const { user, profile, loading, signOut, isPro, supabase } = useAuth()
  const router = useRouter()
  const [accounts, setAccounts] = useState([])
  const [trades, setTrades] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && supabase) {
      loadData()
    }
  }, [user, supabase])

  const loadData = async () => {
    // Load accounts
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    
    setAccounts(accountsData || [])

    // Load trades for each account
    if (accountsData?.length) {
      const tradesMap = {}
      for (const acc of accountsData) {
        const { data: tradesData } = await supabase
          .from('trades')
          .select('*')
          .eq('account_id', acc.id)
          .order('date', { ascending: false })
        tradesMap[acc.id] = tradesData || []
      }
      setTrades(tradesMap)
    }
    setDataLoaded(true)
  }

  const handleEditName = (id, newName) => {
    setAccounts(accounts.map(a => a.id === id ? { ...a, name: newName } : a))
  }

  const addAccount = async () => {
    if (!name || !balance) return
    
    // Check free limit
    if (!isPro && accounts.length >= 1) {
      alert('Free users can only have 1 account. Upgrade to Pro for unlimited accounts!')
      return
    }

    const { data, error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name,
      starting_balance: parseFloat(balance),
    }).select().single()

    if (data) {
      setAccounts([...accounts, data])
      setTrades({ ...trades, [data.id]: [] })
    }
    setName('')
    setBalance('')
    setShowModal(false)
  }

  if (loading || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#777' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '1px' }}>
            <span style={{ color: '#22c55e' }}>JOURNAL</span><span style={{ color: '#fff' }}>PRO</span>
          </a>
          {isPro && <span style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#fff' }}>PRO</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!isPro && <a href="/pricing" style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600 }}>Upgrade to Pro</a>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {profile?.avatar_url && <img src={profile.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />}
            <span style={{ color: '#aaa', fontSize: '14px' }}>{profile?.username || user.email}</span>
          </div>
          <button onClick={signOut} style={{ padding: '8px 16px', background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      {/* Dashboard Title */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '32px', position: 'relative' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '3px', color: '#fff' }}>DASHBOARD</h1>
        <button onClick={() => setShowModal(true)} style={{ position: 'absolute', right: 0, padding: '12px 22px', background: '#1a1a24', border: '1px solid #2a2a36', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>+ Add Account</button>
      </div>

      {/* Accounts */}
      {!dataLoaded ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#777' }}>Loading your accounts...</div>
      ) : accounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: '#14141a', border: '1px solid #222230', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#fff' }}>Welcome to JournalPro!</h2>
          <p style={{ color: '#888', marginBottom: '24px' }}>Create your first trading account to get started</p>
          <button onClick={() => setShowModal(true)} style={{ padding: '14px 28px', background: '#22c55e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>+ Create Account</button>
        </div>
      ) : (
        accounts.map(a => <AccountCard key={a.id} account={a} trades={trades[a.id] || []} isPro={isPro} onEditName={handleEditName} supabase={supabase} />)
      )}

      {/* Add Account Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '14px', padding: '24px', width: '400px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: '#fff' }}>Add Account</h2>
            <div style={{ marginBottom: '16px' }}><label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '8px', textTransform: 'uppercase' }}>Account Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. FTMO 10k" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#fff', fontSize: '14px' }} /></div>
            <div style={{ marginBottom: '24px' }}><label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '8px', textTransform: 'uppercase' }}>Starting Balance ($)</label><input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="e.g. 10000" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#fff', fontSize: '14px' }} /></div>
            <div style={{ display: 'flex', gap: '12px' }}><button onClick={addAccount} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Create</button><button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '14px', background: '#1a1a24', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
