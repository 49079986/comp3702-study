'use strict';
(() => {
const GRAPH={S:[['A',2],['B',1]],A:[['C',2],['G',9]],B:[['C',2],['D',6]],C:[['G',3]],D:[['G',1]],G:[]};
const H={S:5,A:5,B:4,C:3,D:1,G:0};
const clone=x=>JSON.parse(JSON.stringify(x));
const fmt=(x,n=4)=>Number.isFinite(x)?Number(x.toFixed(n)).toString():x<0?'−∞':'∞';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function traceSearch(algorithm){
 let frontier=[{s:'S',g:0,path:['S'],seq:0}],best={S:0},seen=new Set(algorithm==='DFS'?[]:['S']),expanded=[],traces=[],seq=1;
 const priority=n=>algorithm==='UCS'?n.g:algorithm==='GBFS'?H[n.s]:n.g+H[n.s];
 const snapshot=(node,message,done=false)=>({frontier:clone(frontier),expanded:[...expanded],node:node?clone(node):null,message,done});
 traces.push(snapshot(null,'初始化：S 进入 frontier；本实验目标在出队时判断。'));
 while(frontier.length){
   let node;
   if(['UCS','GBFS','A*'].includes(algorithm)){frontier.sort((a,b)=>priority(a)-priority(b)||a.seq-b.seq);node=frontier.shift();if(node.g!==best[node.s])continue;}
   else node=algorithm==='DFS'?frontier.pop():frontier.shift();
   if(algorithm==='DFS'){if(seen.has(node.s))continue;seen.add(node.s);}
   expanded.push(node.s);
   if(node.s==='G'){traces.push(snapshot(node,`取出目标 G。返回 ${node.path.join(' → ')}；成本 ${node.g}。`,true));break;}
   const successors=algorithm==='DFS'?[...GRAPH[node.s]].reverse():GRAPH[node.s];
   const added=[];
   for(const [s,c] of successors){
     const g=node.g+c;
     if(['BFS','DFS'].includes(algorithm)){
       if(seen.has(s))continue;if(algorithm==='BFS')seen.add(s);
     }else{if(best[s]!==undefined&&g>=best[s])continue;best[s]=g;frontier=frontier.filter(n=>n.s!==s);}
     frontier.push({s,g,path:[...node.path,s],seq:seq++});added.push(`${s}(g=${g},h=${H[s]})`);
   }
   if(['UCS','GBFS','A*'].includes(algorithm))frontier.sort((a,b)=>priority(a)-priority(b)||a.seq-b.seq);
   traces.push(snapshot(node,`取出 ${node.s}，g=${node.g}。${added.length?'加入/更新 '+added.join('、'):'没有新后继'}。`));
 }
 return traces;
}
function ac3Trace(){
 let d={A:[1,2,3],B:[1,2,3],C:[1,2,3]},q=[['A','B'],['B','A'],['B','C'],['C','B']],trace=[{d:clone(d),q:clone(q),removed:[],message:'初始每个域都是 {1,2,3}，约束 A<B、B<C。'}];
 const adj={A:['B'],B:['A','C'],C:['B']},order={A:0,B:1,C:2};
 while(q.length){
   const [x,y]=q.shift(),before=[...d[x]];
   d[x]=d[x].filter(a=>d[y].some(b=>order[x]<order[y]?a<b:a>b));
   const removed=before.filter(a=>!d[x].includes(a));
   if(removed.length)for(const z of adj[x])if(z!==y&&!q.some(a=>a[0]===z&&a[1]===x))q.push([z,x]);
   trace.push({d:clone(d),q:clone(q),arc:[x,y],removed,message:`检查 ${x} → ${y}。${removed.length?'删除 '+x+' 的 '+removed.join('、')+'；复查受影响的入弧。':'每个值都有支持，不删值。'}`});
   if(!d[x].length)break;
 }
 trace[trace.length-1].message+=' 队列耗尽，得到 A=1、B=2、C=3。';return trace;
}
const DELTAS=[[-1,0],[0,1],[1,0],[0,-1]],ARROWS=['↑','→','↓','←'];
function gridTransitions(s,a,p=.8){
 if(s===12)return [{s:12,p:1,r:0}];
 if(s===3||s===7)return [{s:12,p:1,r:s===3?1:-1}];
 const out=new Map();
 for(const [dir,prob] of [[a,p],[(a+3)%4,(1-p)/2],[(a+1)%4,(1-p)/2]]){
   let r=Math.floor(s/4)+DELTAS[dir][0],c=s%4+DELTAS[dir][1];let next=r*4+c;
   if(r<0||r>=3||c<0||c>=4||next===5)next=s;
   out.set(next,(out.get(next)||0)+prob);
 }return [...out].map(([s,p])=>({s,p,r:0}));
}
const qGrid=(s,a,v,gamma,p)=>gridTransitions(s,a,p).reduce((t,x)=>t+x.p*(x.r+gamma*v[x.s]),0);
function viStep(v,gamma=.9,p=.8){
 const next=v.map((_,s)=>s===5?0:Math.max(...[0,1,2,3].map(a=>qGrid(s,a,v,gamma,p))));
 return {v:next,delta:Math.max(...next.map((n,s)=>Math.abs(n-v[s])))};
}
function gridPolicy(v,gamma,p){return v.map((_,s)=>{if(s===5)return '■';if(s===12)return 'E';if(s===3||s===7)return 'exit';let scores=[0,1,2,3].map(a=>qGrid(s,a,v,gamma,p));return ARROWS[scores.indexOf(Math.max(...scores))];});}
function rng(seed=42){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function qUpdates(q,r,gamma,alpha,nextMax,nextChosen,terminal=false){let qtarget=r+(terminal?0:gamma*nextMax),starget=r+(terminal?0:gamma*nextChosen);return {qtarget,starget,ql:q+alpha*(qtarget-q),sarsa:q+alpha*(starget-q)};}
function alphaTrace(){
 const tree={id:'R',max:true,kids:[{id:'A',max:false,kids:[3,5,6].map((v,i)=>({id:'A'+i,v}))},{id:'B',max:false,kids:[2,9,1].map((v,i)=>({id:'B'+i,v}))},{id:'C',max:false,kids:[4,7,8].map((v,i)=>({id:'C'+i,v}))}]};
 let visited=[],pruned=[],values={},bounds={},trace=[];
 const record=(id,alpha,beta,message)=>trace.push({id,alpha,beta,message,visited:[...visited],pruned:[...pruned],values:clone(values),bounds:clone(bounds)});
 const descend=n=>n.kids?n.kids.flatMap(descend):[n.id];
 record('R',-Infinity,Infinity,'初始根 MAX，α=−∞、β=+∞；从左到右深度优先。');
 function visit(n,alpha,beta){
   if(!n.kids){visited.push(n.id);values[n.id]=n.v;record(n.id,alpha,beta,`访问叶 ${n.id}，效用 ${n.v}。`);return n.v;}
   let v=n.max?-Infinity:Infinity;
   for(let i=0;i<n.kids.length;i++){
     let x=visit(n.kids[i],alpha,beta);v=n.max?Math.max(v,x):Math.min(v,x);values[n.id]=v;
     if(n.max)alpha=Math.max(alpha,v);else beta=Math.min(beta,v);
     if(alpha>=beta&&i<n.kids.length-1){
       let remaining=n.kids.slice(i+1).flatMap(descend);pruned.push(...remaining);bounds[n.id]=n.max?'≥':'≤';
       record(n.id,alpha,beta,`${n.id}: α=${fmt(alpha)} ≥ β=${fmt(beta)}，剪掉 ${remaining.join('、')}。该节点的 ${v} 是界。`);break;
     }
     record(n.id,alpha,beta,`${n.id} 是 ${n.max?'MAX':'MIN'}：当前值 ${v}，α=${alpha===-Infinity?'−∞':fmt(alpha)}，β=${fmt(beta)}。`);
   }return v;
 }
 let value=visit(tree,-Infinity,Infinity);record('R',value,Infinity,`结束：根值 ${value}，选择 C；看过 ${visited.length}/9 个叶，剪掉 ${pruned.length} 个。`);return trace;
}
window.StudyAlgorithms={traceSearch,ac3Trace,gridTransitions,viStep,gridPolicy,qUpdates,alphaTrace,rng};

const LAB_LIST=[['search','Search / 搜索'],['csp','AC-3 删值'],['andor','AND-OR / 条件计划'],['vi','Value iteration / 价值迭代'],['mcts','MCTS 四步'],['bandit','Bandit 探索'],['td','Q / SARSA'],['vfa','Linear weights / 线性权重'],['minimax','α–β 剪枝'],['nash','Mixed Nash / 混合均衡']];
let cleanup=[];
function dispose(){for(const f of cleanup)f();cleanup=[];}
function el(root,sel){return root.querySelector(sel);}
function on(root,sel,event,fn){const e=el(root,sel);if(e)e.addEventListener(event,fn);}
const labBi=(en,zh)=>`<span class="bi-text"><span class="lang-en" lang="en">${escape(en)}</span><span class="lang-zh" lang="zh-CN">${escape(zh)}</span></span>`;
const LAB_EN=[
['Search: inspect the frontier','Directed teaching graph. Test goals on removal. BFS marks states on generation; DFS marks on pop and explores left first. UCS, GBFS and A* keep improved g-values; ties follow insertion order. Predict which node is removed next.'],
['AC-3: find support or delete a value','Constraints A < B < C, initial domains {1,2,3}. Revising X→Y removes x only if no y supports it. A deletion requeues other incoming arcs Z→X. Final domains are A={1}, B={2}, C={3}; arc consistency alone does not solve every CSP.'],
['AND-OR: cover every possible outcome','Tutorial 5.2. At an OR node choose one action; at an AND node cover all outcomes. Safe Drive, Climb, and Bridge after low grip form a strong plan. Risky Jump fails because DEAD cannot be recovered from. Focusing on one outcome does not delete other outcomes.'],
['Value iteration: reward information propagates','Tutorial 7 style, simplified no-key 3×4 grid with wall [1,1]. Synchronous updates use the previous value vector. Coloured cells award +1 or −1 on exit to an extra absorbing state with value 0. Ordinary moves reward 0; collisions stay in place and their probabilities add.'],
['MCTS: four phases improve an estimate','One decision layer followed by one stochastic rollout step; this is a teaching tree. Select by UCB, expand a nonterminal branch, simulate a return, then back up visit counts and the sample mean. A succeeds with probability .4, B with .7; reward on success is 2. Fixed seed; finite sampling does not guarantee optimality.'],
['Bandits: exploration changes cumulative reward','Three Bernoulli arms, fixed seed 42. The learner does not know the true means. UCB tries each arm once; C is inside the square root. The solid curve is realised reward, the dashed curve is 0.7T. Pseudo-regret sums 0.7 minus the selected arm mean, rather than realised reward noise.'],
['Q-learning versus SARSA: change the target','Both start from the same old Q. Q-learning uses r+γ max Q′, while SARSA uses r+γQ(s′,a′) for the actual next action. With Q=3, r=2, α=.5, γ=.9, max Q′=8 and chosen Q′=1, the updates are 6.1 and 2.95. If the successor terminates, both targets equal r.'],
['Linear approximation: one error changes shared weights','Tutorial 9.2. Old weights (4,−1), features (.5,1), terminal successor. Old Q=1; δ=r−1. Update both weights using the same old δ: wᵢ←wᵢ+αδfᵢ. At r=−500 and α=.004, new weights are (2.998,−3.004). This changes a shared function, rather than one table entry.'],
['Alpha-beta: explain why a leaf can be skipped','MAX root, MIN children, left-to-right traversal. All payoffs are for MAX. Once A returns 3, the first leaf of B gives MIN an upper bound of 2; the remaining B leaves cannot beat 3. Root chooses C with value 4; 7 of 9 leaves are evaluated.'],
['Mixed Nash: remove profitable unilateral deviations','Goal probabilities [[.6,.2],[.3,.9]]. The kicker maximises and the goalkeeper minimises. p is the kicker probability of right; q is the goalkeeper probability of right. At p=.4 and q=.3, both opponent pure actions give .48 and unilateral improvement is 0. Change p or q to inspect deviations.']
];
const LAB_TITLES=['看见 frontier，理解搜索选择','AC-3：找到支持，或删除这个值','AND-OR：环境分支由环境决定','价值迭代：价值从奖励格向外传播','MCTS：一次模拟如何变成更好的估计','多臂老虎机：探索如何影响累计收益','Q-learning 与 SARSA：只改 target，就会学到不同结果','线性函数逼近：一次错误，同时影响共享权重','α–β：为什么这些叶子可以不看','混合 Nash：让对手无法通过单方改变获益'];
function intro(title,text){const e=LAB_EN[LAB_TITLES.indexOf(title)]||[title,text];return `<div class="lab-intro"><h2>${labBi(e[0],title)}</h2><p>${labBi(e[1],text)}</p></div>`;}
function traceCopy(t){let en='';if(t.frontier){en=!t.node?'Initialise: put S in the frontier. Goals are checked on removal.':t.done?`Remove goal G. Return ${t.node.path.join(' → ')} with cost ${t.node.g}.`:`Remove ${t.node.s}, g=${t.node.g}. Current frontier: ${t.frontier.map(n=>n.s+'(g='+n.g+',h='+H[n.s]+')').join(', ')||'empty'}.`;}else if(t.d){en=t.arc?`Revise ${t.arc.join(' → ')}. ${t.removed.length?'Remove '+t.removed.join(', ')+' from '+t.arc[0]+'; requeue other incoming arcs.':'Every value has support; remove nothing.'} Queue length: ${t.q.length}.`:'Initial domains: A=B=C={1,2,3}; constraints A<B and B<C.';}else{en=`Current node ${t.id}; α=${fmt(t.alpha)}, β=${fmt(t.beta)}. Known value/bound: ${t.bounds[t.id]||''}${t.values[t.id]??'not yet evaluated'}. Evaluated leaves: ${t.visited.join(', ')||'none'}. Pruned leaves: ${t.pruned.join(', ')||'none'}.`;}return labBi(en,t.message);}

function stepper(root,trace,render){
 let at=0,timer=null;
 function stop(){if(timer)clearInterval(timer);timer=null;}
 function draw(){render(at,trace[at],!!timer);on(root,'[data-step]','click',()=>{if(at<trace.length-1)at++;else stop();draw();});on(root,'[data-back]','click',()=>{stop();at=Math.max(0,at-1);draw();});on(root,'[data-reset]','click',()=>{stop();at=0;draw();});on(root,'[data-play]','click',()=>{if(timer)stop();else{if(at===trace.length-1)at=0;timer=setInterval(()=>{if(at<trace.length-1)at++;if(at===trace.length-1)stop();draw();},900);}draw();});}
 cleanup.push(stop);draw();
}
function controls(at,total,playing){return `<button data-back ${at===0?'disabled':''}>Back / 上一步</button><button class="primary" data-step ${at===total-1?'disabled':''}>Next / 下一步</button><button data-play>${playing?'Pause / 暂停':'Play / 播放'}</button><button data-reset>Reset / 重置</button><span class="small-label">步骤 ${at} / ${total-1}</span>`;}
function searchGraphic(t){
 const pos={S:[65,175],A:[235,70],B:[235,280],C:[435,100],D:[435,290],G:[650,175]},front=new Set(t.frontier.map(x=>x.s)),path=t.done?t.node.path:[];
 let s='<svg viewBox="0 0 730 380" role="img" aria-label="有向搜索图，显示当前节点、frontier 与已访问节点"><defs><marker id="ga" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#8da69f"/></marker></defs>';
 for(const [from,edges] of Object.entries(GRAPH))for(const [to,c] of edges){
  let [x,y]=pos[from],[xx,yy]=pos[to],dx=xx-x,dy=yy-y,len=Math.hypot(dx,dy),a=x+dx/len*27,b=y+dy/len*27,aa=xx-dx/len*29,bb=yy-dy/len*29,selected=path.some((n,i)=>n===from&&path[i+1]===to);
  s+=`<line x1="${a}" y1="${b}" x2="${aa}" y2="${bb}" stroke="${selected?'#137d85':'#a7b9ae'}" stroke-width="${selected?4:2}" marker-end="url(#ga)"/><rect x="${(a+aa)/2-10}" y="${(b+bb)/2-11}" width="22" height="22" rx="4" fill="#f4f7f2"/><text x="${(a+aa)/2+1}" y="${(b+bb)/2+5}" text-anchor="middle" font-size="16" fill="#4a6768">${c}</text>`;
 }
 for(const [n,[x,y]] of Object.entries(pos)){
   const current=t.node?.s===n,fill=current?'#f7d36f':front.has(n)?'#dceee4':t.expanded.includes(n)?'#1d5963':'white';
   s+=`<circle cx="${x}" cy="${y}" r="27" fill="${fill}" stroke="#739a8c" stroke-width="2"/><text x="${x}" y="${y+6}" text-anchor="middle" font-size="20" font-weight="600" fill="${t.expanded.includes(n)&&!current?'white':'#193440'}">${n}</text><text x="${x}" y="${y+50}" text-anchor="middle" font-size="12" fill="#60796c">h=${H[n]}</text>`;
 }return s+'</svg>';
}
function mountSearch(root,algo='A*'){
 stepper(root,traceSearch(algo),(i,t,playing)=>{
  root.innerHTML=intro('看见 frontier，理解搜索选择','有向教学图 · 目标出队判断 · BFS生成时去重，DFS出栈时去重且左侧优先；其余算法保留更小g，同分按入队顺序。')+`<div class="lab-toolbar"><label>算法 <select id="search-algo">${['BFS','DFS','UCS','GBFS','A*'].map(a=>`<option ${a===algo?'selected':''}>${a}</option>`).join('')}</select></label>${controls(i,traceSearch(algo).length,playing)}</div><div class="lab-grid"><div class="lab-graphic">${searchGraphic(t)}</div><div><div class="small-label">FRONTIER · ${algo==='DFS'?'栈顶在表格末尾':'下一个取首行'}</div><table class="lab-table"><thead><tr><th>节点</th><th>g</th><th>h</th><th>f / 排序值</th></tr></thead><tbody>${t.frontier.map(n=>`<tr><td>${n.s}</td><td>${n.g}</td><td>${H[n.s]}</td><td>${algo==='BFS'||algo==='DFS'?'—':algo==='UCS'?n.g:algo==='GBFS'?H[n.s]:n.g+H[n.s]}</td></tr>`).join('')||'<tr><td colspan="4">空</td></tr>'}</tbody></table><p class="small-label">取点顺序（含已取出的目标）</p><strong>${t.expanded.join(' → ')||'尚未开始'}</strong><div class="lab-log" aria-live="polite">${traceCopy(t)}</div></div></div><div class="callout">黄色：本步节点；浅绿：frontier；深色：已经取出。DFS 的栈空间分析不自动包含整张 visited 表。用纸预测下一步，再点按钮。</div>`;
  on(root,'#search-algo','change',e=>{dispose();mountSearch(root,e.target.value);});
 });
}
function mountCsp(root){const trace=ac3Trace();stepper(root,trace,(i,t,playing)=>{
 root.innerHTML=intro('AC-3：找到支持，或删除这个值','教学约束 A<B<C，每个变量初始域 {1,2,3}；队列去重。')+`<div class="lab-toolbar">${controls(i,trace.length,playing)}</div><div class="lab-grid"><div><div class="formula-box">检查 ${t.arc?t.arc.join(' → '):'X → Y'}：∀x∈D(X)，∃y∈D(Y) 使约束成立。</div>${Object.entries(t.d).map(([x,vals])=>`<div class="domain-row"><strong>${x}</strong>${[1,2,3].map(v=>`<span class="value-token ${vals.includes(v)?'':'deleted'}">${v}</span>`).join('')}</div>`).join('')}</div><div><div class="small-label">剩余弧队列</div><div class="lab-log">${t.q.map(a=>a.join('→')).join('，')||'空 · 检查完成'}</div><div class="lab-log" aria-live="polite">${traceCopy(t)}</div></div></div><div class="callout">删除 X 的值后，要检查其他邻居 Z→X。当前例子唯一解，并不意味着 AC-3 对所有 CSP 都能判定有解。</div>`;
 });}
function mountAndor(root){let choice='safe',outcome='both';function draw(){root.innerHTML=intro('AND-OR：环境分支由环境决定','源于 Tutorial 5.2；强条件计划需要覆盖每一种可能结果。')+`<div class="lab-toolbar"><label>S 的动作 <select id="plan-action"><option value="safe" ${choice==='safe'?'selected':''}>Safe Drive → A</option><option value="risk" ${choice==='risk'?'selected':''}>Risky Jump → G / DEAD</option></select></label><label>显示实际结果 <select id="plan-outcome"><option value="both">所有可能结果</option><option value="good" ${outcome==='good'?'selected':''}>这次成功分支</option><option value="bad" ${outcome==='bad'?'selected':''}>另一个分支</option></select></label></div><div class="lab-graphic"><svg viewBox="0 0 740 310" role="img" aria-label="所选动作的 AND-OR 结果树"><path d="M110 160L330 160L580 70M330 160L580 260" fill="none" stroke="#9bb2a5" stroke-width="3"/><rect x="25" y="120" width="170" height="80" rx="12" fill="#deece6"/><text x="110" y="165" text-anchor="middle" font-size="20">S · OR</text><rect x="245" y="120" width="170" height="80" rx="12" fill="#f7d36f"/><text x="330" y="155" text-anchor="middle" font-size="17">${choice==='safe'?'Drive → A':'Risky Jump'}</text><text x="330" y="180" text-anchor="middle" font-size="13">${choice==='safe'?'再选 Climb · AND':'AND · 全结果'}</text>${[['good',70,choice==='safe'?'High grip → G':'Success → G'],['bad',260,choice==='safe'?'Low grip → B → G':'Hazard → DEAD']].map(([kind,y,text])=>`<g opacity="${outcome==='both'||outcome===kind?1:.25}"><rect x="475" y="${y-33}" width="235" height="66" rx="10" fill="${choice==='risk'&&kind==='bad'?'#f0d2cc':'#cfe7d6'}"/><text x="592" y="${y+6}" text-anchor="middle" font-size="16">${text}</text></g>`).join('')}</svg></div><div class="lab-log" aria-live="polite"><span class="lang-en">${choice==='safe'?'SOLVED: Drive, then Climb. On Low Grip, execute Bridge from B; on High Grip, stop at G.':'CLOSED: the DEAD outcome cannot be recovered from. A strong plan must succeed for every possible outcome.'}</span><span class="lang-zh">${choice==='safe'?'SOLVED：Drive；Climb；若 Low Grip 到 B，再执行 Bridge；High Grip 已到 G 时结束。':'CLOSED：DEAD 是无法恢复的结果，所以这个 AND 动作无法保证成功。即使本次正好到 G，也不能抹去 DEAD 的可能性。'}</span></div><div class="callout">“显示这次结果”只是聚焦视图，不会把未发生的可能性从模型中删除。强计划的判定仍检查全部分支。</div>`;on(root,'#plan-action','change',e=>{choice=e.target.value;draw();});on(root,'#plan-outcome','change',e=>{outcome=e.target.value;draw();});}draw();}
function mountVi(root){let gamma=.9,p=.8,v=Array(13).fill(0),iteration=0,delta=0,timer=null;const stop=()=>{if(timer)clearInterval(timer);timer=null;};cleanup.push(stop);
 const step=()=>{let result=viStep(v,gamma,p);v=result.v;delta=result.delta;iteration++;if(iteration>1&&delta<1e-8)stop();draw();};
 function draw(){let policy=gridPolicy(v,gamma,p);root.innerHTML=intro('价值迭代：价值从奖励格向外传播','Tutorial 7 风格无钥匙简化版 · 3×4 · 障碍 [1,1] · 同步 VI · 彩色格执行 exit 才获奖励。')+`<div class="lab-toolbar"><label>γ <input id="vi-gamma" type="range" min=".1" max=".99" step=".01" value="${gamma}"><output>${fmt(gamma,2)}</output></label><label>成功概率 p <input id="vi-p" type="range" min=".4" max="1" step=".05" value="${p}"><output>${fmt(p,2)}</output></label><button class="primary" id="vi-step">Step / 迭代一次</button><button id="vi-ten">10 iterations</button><button id="vi-play">${timer?'Pause / 暂停':'Play / 播放'}</button><button id="vi-reset">Reset / 重置</button></div><div class="lab-grid"><div class="lab-graphic"><div class="gridworld">${v.slice(0,12).map((val,s)=>`<div class="gridcell ${s===5?'wall':s===3?'goal':s===7?'hazard':''}">${s===5?'障碍':`<small>[${Math.floor(s/4)},${s%4}] ${s===3?'+1':s===7?'−1':''}</small><strong>${fmt(val,3)}</strong><span class="arrow">${policy[s]}</span>`}</div>`).join('')}</div></div><div><div class="metric-grid"><div class="metric">同步轮数<strong>${iteration}</strong></div><div class="metric">Δ<strong>${fmt(delta,5)}</strong></div><div class="metric">V(exited)<strong>0</strong></div></div><div class="lab-log" aria-live="polite"><span class="lang-en">V${iteration} is displayed. ${iteration===0?'Initially all values are 0; the first sweep reveals the exit rewards.':'Arrows are extracted by computing Q from the current value vector.'} At the upper-left corner, Up stays in place with probability ${fmt(p+(1-p)/2,3)} and moves right with probability ${fmt((1-p)/2,3)}. Collision probabilities add.</span><span class="lang-zh">${iteration===0?'初始 V₀ 全为 0。第一轮只让两格 exit 奖励显现。':`V${iteration} 已更新；箭头使用当前 V${iteration} 再计算 Q 并提取策略。`}
左上角选 Up：留原地概率 ${fmt(p+(1-p)/2,3)}，向右 ${fmt((1-p)/2,3)}。撞墙的概率合并到原格。</span></div><div class="formula-box">Vₖ₊₁(s)=maxₐ Σₛ′P(s′∣s,a)[R+γVₖ(s′)]</div></div></div><div class="callout">彩色格并非零价值的最终吸收态：V(绿色)=+1，V(红色)=−1，执行 exit 后到额外状态 exited，其价值为0。所有普通移动奖励0。箭头平局依次按 Up、Right、Down、Left。</div>`;
 on(root,'#vi-step','click',step);on(root,'#vi-ten','click',()=>{for(let j=0;j<10;j++){let r=viStep(v,gamma,p);v=r.v;delta=r.delta;iteration++;}draw();});on(root,'#vi-reset','click',()=>{stop();v=Array(13).fill(0);iteration=0;delta=0;draw();});on(root,'#vi-play','click',()=>{if(timer)stop();else timer=setInterval(step,650);draw();});
 for(const [id,change] of [['#vi-gamma',x=>gamma=x],['#vi-p',x=>p=x]])on(root,id,'change',e=>{stop();change(Number(e.target.value));v=Array(13).fill(0);iteration=0;delta=0;draw();});
 }draw();}
function mountMcts(root){let phase=-1,stats=[{n:0,q:0},{n:0,q:0}],random=rng(3702),selected=0,reward=null,ret=null,round=0,message='先选择一条树内动作，试着预测接下来的阶段。',timer=null;
 const stop=()=>{if(timer)clearInterval(timer);timer=null;};cleanup.push(stop);
 const score=i=>stats[i].n?stats[i].q+Math.sqrt(2*Math.log(Math.max(1,stats[0].n+stats[1].n))/stats[i].n):Infinity;
 function step(){phase=(phase+1)%4;
   if(phase===0){selected=stats.findIndex(x=>x.n===0);if(selected<0)selected=score(0)>=score(1)?0:1;reward=null;ret=null;message=`Selection：${stats[selected].n?'按 UCB 分数':'优先访问未尝试动作'}选择 ${selected?'B':'A'}。`;}
   else if(phase===1)message=`Expansion：${stats[selected].n?'该分支已有节点，继续沿此教学 rollout 分支':'加入新动作分支及后继节点'}。真正终止节点不扩展。`;
   else if(phase===2){reward=random()<[.4,.7][selected]?2:0;ret=(selected===0?.1:0)+.9*reward;message=`Simulation：经过一步 rollout 得后续奖励 ${reward}。本边即时奖励 ${selected===0?.1:0}，折扣 γ=.9，因此 G=${fmt(ret)}。`;}
   else{let old=clone(stats[selected]);stats[selected].n++;stats[selected].q+=(ret-stats[selected].q)/stats[selected].n;round++;message=`Backup：${selected?'B':'A'} 的 N ${old.n}→${stats[selected].n}，Q̄=${fmt(old.q)}+(${fmt(ret)}−${fmt(old.q)})/${stats[selected].n}=${fmt(stats[selected].q)}。`;}
   draw();
 }
 function draw(){let names=['Selection','Expansion','Simulation','Backup'];root.innerHTML=intro('MCTS：一次模拟如何变成更好的估计','单决策层教学树，随后一步随机 rollout；用于观察四阶段和均值更新，不是完整 Gridworld 实现。')+`<div class="phase-row">${names.map((n,i)=>`<div class="phase ${phase===i?'active':''}">${i+1} · ${n}</div>`).join('')}</div><div class="lab-toolbar"><button class="primary" id="mcts-step">Next phase / 下一阶段</button><button id="mcts-play">${timer?'Pause / 暂停':'Play / 播放'}</button><button id="mcts-reset">重置种子与统计</button><span class="small-label">已完成 ${round} 次模拟</span></div><div class="lab-grid"><div class="lab-graphic"><svg viewBox="0 0 570 310" role="img" aria-label="MCTS根的两条动作分支及采样回报"><path d="M285 70L145 190M285 70L425 190" stroke="#a4b8aa" stroke-width="3"/><circle cx="285" cy="70" r="39" fill="#dfece3"/><text x="285" y="66" text-anchor="middle" font-size="19">S</text><text x="285" y="87" text-anchor="middle" font-size="12">N=${stats[0].n+stats[1].n}</text>${stats.map((x,i)=>`<g><circle cx="${145+280*i}" cy="190" r="49" fill="${phase>=0&&selected===i?'#f7d36f':'white'}" stroke="#9bb5a8"/><text x="${145+280*i}" y="182" text-anchor="middle" font-size="20">${i?'B':'A'}</text><text x="${145+280*i}" y="204" text-anchor="middle" font-size="12">n=${x.n}, Q=${fmt(x.q,2)}</text><text x="${145+280*i}" y="272" text-anchor="middle" font-size="13">${phase>=2&&selected===i?'本次 G='+fmt(ret):'rollout 成功奖励 2'}</text></g>`).join('')}</svg></div><div><table class="lab-table"><thead><tr><th>边</th><th>N</th><th>均值</th><th>当前 UCB</th></tr></thead><tbody>${stats.map((x,i)=>`<tr class="${phase>=0&&i===selected?'highlight':''}"><td>${i?'B':'A'}</td><td>${x.n}</td><td>${fmt(x.q)}</td><td>${fmt(score(i))}</td></tr>`).join('')}</tbody></table><div class="lab-log" aria-live="polite">${labBi(phase<0?'Predict the next phase before stepping.':phase===0?`Selection: choose ${selected?'B':'A'} by trying an unvisited action first, then using UCB.`:phase===1?'Expansion: add an unvisited action/successor; a true terminal node is not expanded.':phase===2?`Simulation: rollout reward ${reward}; G=${selected===0?.1:0}+.9×${reward}=${fmt(ret)}.`:`Backup: N=${stats[selected].n}; updated mean Q=${fmt(stats[selected].q)} using return G=${fmt(ret)}.`,message)}</div></div></div><div class="callout">演示环境的成功概率 A=.4、B=.7，agent 只用采样均值；固定种子便于复现。UCB=Q̄+√(2lnN/n)。表内 UCB 始终按当前统计重算；本轮选择依据发生在 Selection 时。</div>`;
 on(root,'#mcts-step','click',step);on(root,'#mcts-play','click',()=>{if(timer)stop();else timer=setInterval(step,850);draw();});on(root,'#mcts-reset','click',()=>{stop();phase=-1;stats=[{n:0,q:0},{n:0,q:0}];random=rng(3702);round=0;reward=ret=null;message='已重置。';draw();});}draw();}
function mountBandit(root){let policy='ucb',epsilon=.1,C=2,random=rng(42),stats=[0,0,0].map(()=>({n:0,q:0})),rewards=0,regret=0,history=[],last=-1;const means=[.25,.5,.7];
 function reset(){random=rng(42);stats=[0,0,0].map(()=>({n:0,q:0}));rewards=regret=0;history=[];last=-1;}
 function pull(){let n=history.length,a=0;
   if(policy==='ucb'){a=stats.findIndex(x=>!x.n);if(a<0){const values=stats.map(x=>x.q+Math.sqrt(C*Math.log(n)/x.n));a=values.indexOf(Math.max(...values));}}
   else if(policy==='eps'&&random()<epsilon)a=Math.floor(random()*3);
   else{let best=Math.max(...stats.map(x=>x.q)),ties=stats.flatMap((x,i)=>x.q===best?[i]:[]);a=ties[Math.floor(random()*ties.length)];}
   let r=Number(random()<means[a]);stats[a].n++;stats[a].q+=(r-stats[a].q)/stats[a].n;rewards+=r;regret+=.7-means[a];history.push({reward:rewards,regret});last=a;
 }
 function chart(){let N=Math.max(100,history.length),coords=history.map((h,i)=>`${45+(i+1)/N*530},${275-h.reward/N*235}`).join(' ');return `<svg viewBox="0 0 620 320" role="img" aria-label="Bandit累计回报随拉臂次数变化"><path d="M45 30V275H585" fill="none" stroke="#a4b7a8"/><path d="M45 275L${45+history.length/N*530} ${275-.7*history.length/N*235}" stroke="#c69a2c" stroke-width="2" stroke-dasharray="6 5"/><polyline points="45,275 ${coords}" fill="none" stroke="#137d85" stroke-width="3"/><text x="45" y="21" font-size="12">累计回报</text><text x="445" y="307" font-size="12">拉臂次数（最大 ${N}）</text><text x="60" y="55" font-size="12" fill="#137d85">实线：实际采样回报</text><text x="60" y="76" font-size="12" fill="#987d26">虚线：最佳臂期望 0.7T</text></svg>`;}
 function draw(){root.innerHTML=intro('多臂老虎机：探索如何影响累计收益','三个 Bernoulli 臂 · 固定随机种子42 · 可切换策略重新试验；真实均值仅供学习者核对。')+`<div class="lab-toolbar"><label>策略 <select id="bandit-policy">${[['greedy','Greedy'],['eps','ε-greedy'],['ucb','UCB（C在根号内）']].map(([id,t])=>`<option value="${id}" ${id===policy?'selected':''}>${t}</option>`).join('')}</select></label><label>ε <input id="bandit-epsilon" type="range" min="0" max="1" step=".05" value="${epsilon}"><output>${fmt(epsilon,2)}</output></label><label>C <input id="bandit-c" type="number" min="0" max="20" step=".5" value="${C}"></label><button class="primary" id="bandit-one">1 pull / 拉1次</button><button id="bandit-hundred">100 pulls</button><button id="bandit-reset">Reset / 重置</button></div><div class="metric-grid"><div class="metric">拉臂总数<strong>${history.length}</strong></div><div class="metric">累计回报<strong>${rewards}</strong></div><div class="metric">Pseudo-regret<strong>${fmt(regret,2)}</strong></div></div><div class="lab-grid"><div class="lab-graphic">${chart()}</div><div><table class="lab-table"><thead><tr><th>臂</th><th>真实 μ</th><th>次数</th><th>样本均值</th></tr></thead><tbody>${stats.map((x,i)=>`<tr class="${last===i?'highlight':''}"><td>${'ABC'[i]}</td><td>${means[i]}</td><td>${x.n}</td><td>${fmt(x.q)}</td></tr>`).join('')}</tbody></table><div class="lab-log" aria-live="polite"><span class="lang-en">${history.length?'Last arm: '+ 'ABC'[last]+'. Estimate quality depends on sampling; try another policy with the same seed.':'The agent estimates arm means only from sampled rewards.'} Pseudo-regret = Σ(0.7 − selected arm true mean) = ${fmt(regret)}.</span><span class="lang-zh">${history.length?'最后选 '+ 'ABC'[last]+'。当前估计可能因随机性选错；试着切换策略后用相同种子重置。':'agent 不知道真实均值，只根据自己拉过的奖励估计。'}
Pseudo-regret=Σ(0.7−被选臂真实均值)，不是“期望线−本次实际回报”。</span></div></div></div><div class="callout">改变策略/参数会重新开始。UCB 首先各臂试一次。单次种子运行用于解释机制，不能证明一个策略在所有问题上优于另一个。最多演示3000次。</div>`;
 on(root,'#bandit-one','click',()=>{if(history.length<3000)pull();draw();});on(root,'#bandit-hundred','click',()=>{for(let j=0;j<100&&history.length<3000;j++)pull();draw();});on(root,'#bandit-reset','click',()=>{reset();draw();});on(root,'#bandit-policy','change',e=>{policy=e.target.value;reset();draw();});on(root,'#bandit-epsilon','change',e=>{epsilon=Number(e.target.value);reset();draw();});on(root,'#bandit-c','change',e=>{C=Math.max(0,Math.min(20,Number(e.target.value)||0));reset();draw();});}draw();}
function mountTd(root){root.innerHTML=intro('Q-learning 与 SARSA：只改 target，就会学到不同结果','同一条经验 (s,a,r,s′)，行为在下一状态选择一个动作；两种算法均从同一旧 Q 出发。')+`<div class="lab-toolbar" id="td-inputs">${[['q','Old Q',3],['r','Reward r',2],['gamma','γ',.9],['alpha','α',.5],['best','max Q′',8],['chosen','Chosen Q′',1]].map(([id,label,v])=>`<label>${label}<input id="td-${id}" type="number" step=".1" value="${v}" ${id==='alpha'||id==='gamma'?'min="0" max="1"':''}></label>`).join('')}<label><input id="td-terminal" type="checkbox"> s′ terminal / 已终止</label></div><div id="td-results" aria-live="polite"></div><div class="callout">“实际 a′ 的 Q”应 ≤ max Q′。Q-learning 用 max，SARSA 用实际动作；终止后继时二者都只以 r 为目标。修改数字后可观察差异。</div>`;
 function update(){let q=+el(root,'#td-q').value,r=+el(root,'#td-r').value,g=+el(root,'#td-gamma').value,a=+el(root,'#td-alpha').value,b=+el(root,'#td-best').value,c=+el(root,'#td-chosen').value,t=el(root,'#td-terminal').checked;
 if([q,r,g,a,b,c].some(x=>!Number.isFinite(x))||a<0||a>1||g<0||g>1||c>b){el(root,'#td-results').innerHTML='<div class="notice">请使用有效数字：α、γ在[0,1]，实际动作Q不能大于max Q。</div>';return;}
 const out=qUpdates(q,r,g,a,b,c,t);el(root,'#td-results').innerHTML=`<div class="lab-grid"><div class="feature-card calculation"><div class="eyebrow">Q-LEARNING / OFF-POLICY</div>target = ${r}${t?'':` + ${g} × ${b}`} = ${fmt(out.qtarget)}<br>δ = ${fmt(out.qtarget-q)}<br>New Q = ${q} + ${a} × ${fmt(out.qtarget-q)}<div class="result">${fmt(out.ql)}</div></div><div class="feature-card calculation"><div class="eyebrow">SARSA / ON-POLICY</div>target = ${r}${t?'':` + ${g} × ${c}`} = ${fmt(out.starget)}<br>δ = ${fmt(out.starget-q)}<br>New Q = ${q} + ${a} × ${fmt(out.starget-q)}<div class="result">${fmt(out.sarsa)}</div></div></div><div class="lab-log"><span class="lang-en">${t?'No future return after termination: both targets equal r.':`Target difference = γ(max Q′ − chosen Q′) = ${fmt(g*(b-c))}. Update difference = α × target difference = ${fmt(out.ql-out.sarsa)}.`}</span><span class="lang-zh">${t?'终止后没有未来奖励，因此两者相同。':'两者下一状态估计的差异：γ × (max Q′ − 实际 Q′) = '+fmt(g*(b-c))+'；新Q的差异还要乘α，得到 '+fmt(out.ql-out.sarsa)+'。'}</span></div>`;}
 el(root,'#td-inputs').addEventListener('input',update);update();}
function mountVfa(root){root.innerHTML=intro('线性函数逼近：一次错误，同时影响共享权重','Tutorial 9.2 · 固定旧权重 (4,−1)、特征 (.5,1)；本次后继为终止状态。')+`<div class="lab-toolbar"><label>奖励 r <input id="vfa-r" type="number" step="10" value="-500"></label><label>α <input id="vfa-alpha" type="number" min="0" max="1" step=".001" value=".004"></label><button id="vfa-example">Course example / 课程算例</button></div><div id="vfa-output" aria-live="polite"></div><div class="callout">所有更新使用同一个旧 δ。这里显示一次更新，不是不断把新权重作为下一次旧值。参考答案约写为(3,−3)，精确值是(2.998,−3.004)。</div>`;
 function draw(){let r=+el(root,'#vfa-r').value,a=+el(root,'#vfa-alpha').value;if(!Number.isFinite(r)||!Number.isFinite(a)||a<0||a>1){el(root,'#vfa-output').textContent='请输入有效奖励，α在[0,1]。';return;}let delta=r-1,w1=4+a*delta*.5,w2=-1+a*delta;el(root,'#vfa-output').innerHTML=`<div class="formula-box">旧 Q = 4 × 0.5 − 1 × 1 = 1<br>终止 target = ${r}；δ = ${r} − 1 = ${fmt(delta)}</div><div class="lab-grid"><div class="feature-card calculation"><div class="eyebrow">FOOD FEATURE</div>w_food = 4 + ${a} × ${fmt(delta)} × .5<div class="result">${fmt(w1,6)}</div></div><div class="feature-card calculation"><div class="eyebrow">GHOST FEATURE</div>w_ghost = −1 + ${a} × ${fmt(delta)} × 1<div class="result">${fmt(w2,6)}</div></div></div><div class="lab-log"><span class="lang-en">For the same feature vector, new Q=${fmt(w1)}×.5+(${fmt(w2)})=${fmt(w1*.5+w2,6)}. Shared weights change a function; the update does not directly set one table entry equal to r.</span><span class="lang-zh">同一特征向量的New Q = ${fmt(w1)} × .5 + ${fmt(w2)} × 1 = ${fmt(w1*.5+w2,6)}。
这里不能直接把表格 Q 设成 r，因为权重共享改变的是整个近似函数。</span></div>`;}
 on(root,'#vfa-r','input',draw);on(root,'#vfa-alpha','input',draw);on(root,'#vfa-example','click',()=>{el(root,'#vfa-r').value=-500;el(root,'#vfa-alpha').value=.004;draw();});draw();}
function minimaxGraphic(t){let pos={R:[360,45],A:[125,145],B:[360,145],C:[595,145]};for(const [n,xx]of[['A',125],['B',360],['C',595]])for(let j=0;j<3;j++)pos[n+j]=[xx+(j-1)*68,270];let s='<svg viewBox="0 0 720 340" role="img" aria-label="α–β搜索树，红色叉表示被剪叶">';for(const n of['A','B','C']){s+=`<line x1="360" y1="65" x2="${pos[n][0]}" y2="125" stroke="#a3b8aa" stroke-width="2"/>`;for(let j=0;j<3;j++){let id=n+j;s+=`<line x1="${pos[n][0]}" y1="165" x2="${pos[id][0]}" y2="250" stroke="${t.pruned.includes(id)?'#d2aca4':'#a3b8aa'}" ${t.pruned.includes(id)?'stroke-dasharray="5 4"':''} stroke-width="2"/>`;}}
 for(const [id,[x,y]]of Object.entries(pos)){let leaf=id.length===2,pruned=t.pruned.includes(id),visited=t.visited.includes(id),fill=id===t.id?'#f7d36f':pruned?'#f5ddd7':visited?'#dbeee2':'white';s+=`<rect x="${x-27}" y="${y-22}" width="54" height="44" rx="${leaf?7:18}" fill="${fill}" stroke="#86a99a"/><text x="${x}" y="${y+6}" text-anchor="middle" font-size="17">${leaf?{A0:3,A1:5,A2:6,B0:2,B1:9,B2:1,C0:4,C1:7,C2:8}[id]:id}</text><text x="${x}" y="${y+43}" text-anchor="middle" font-size="12" fill="#58766a">${leaf?(pruned?'剪枝':visited?'已访问':'未访问'):(id==='R'?'MAX':'MIN')+(t.values[id]!==undefined?' '+(t.bounds[id]||'')+t.values[id]:'')}</text>${pruned?`<path d="M${x-22} ${y-17}L${x+22} ${y+17}M${x+22} ${y-17}L${x-22} ${y+17}" stroke="#b76c5c" stroke-width="2"/>`:''}`;}return s+'</svg>';}
function mountMinimax(root){let trace=alphaTrace();stepper(root,trace,(i,t,playing)=>{root.innerHTML=intro('α–β：为什么这些叶子可以不看','独立教学树 · 根 MAX，第二层 MIN · 叶值均从 MAX 角度解释 · 从左向右。')+`<div class="lab-toolbar">${controls(i,trace.length,playing)}</div><div class="lab-graphic">${minimaxGraphic(t)}</div><div class="metric-grid"><div class="metric">已看叶数<strong>${t.visited.length} / 9</strong></div><div class="metric">剪去叶数<strong>${t.pruned.length}</strong></div><div class="metric">当前节点<strong>${t.id}</strong></div></div><div class="lab-log" aria-live="polite">${traceCopy(t)}</div><div class="callout">剪枝时 B 的 ≤2 只是上界；真实 min(2,9,1)=1。根只需知道 B 不可能胜过已找到的3，所以不必继续精确求它。最终根选 C，值4。</div>`;});}
function mountNash(root){let p=.4,q=.3;
 function draw(){let rowL=.6-.4*q,rowR=.3+.6*q,colL=.6-.3*p,colR=.2+.7*p,eu=(1-p)*rowL+p*rowR,rowGain=Math.max(rowL,rowR)-eu,colGain=eu-Math.min(colL,colR),eq=rowGain<1e-8&&colGain<1e-8;
 root.innerHTML=intro('混合 Nash：让对手无法通过单方改变获益','讲义点球矩阵 [[.6,.2],[.3,.9]] · 踢球者最大化进球率，守门员最小化。')+`<div class="lab-toolbar"><label>p = 踢球者选右 <input id="nash-p" type="range" min="0" max="1" step=".01" value="${p}"><output>${fmt(p,2)}</output></label><label>q = 守门员选右 <input id="nash-q" type="range" min="0" max="1" step=".01" value="${q}"><output>${fmt(q,2)}</output></label><button class="primary" id="nash-eq">Set equilibrium / 设为均衡</button><button id="nash-random">Inspect deviation / 看偏离</button></div><div class="metric-grid"><div class="metric">当前进球概率<strong>${fmt(eu,4)}</strong></div><div class="metric">踢球者最佳单方提升<strong>${fmt(rowGain,4)}</strong></div><div class="metric">守门员最佳单方降低<strong>${fmt(colGain,4)}</strong></div></div><div class="lab-grid"><div class="lab-graphic"><svg viewBox="0 0 530 350" role="img" aria-label="两条踢球动作的期望进球率随守门员选右概率变化"><path d="M55 35V290H485" fill="none" stroke="#9cb6a6"/><path d="M55 ${290-.6*240}L475 ${290-.2*240}" stroke="#137d85" stroke-width="3"/><path d="M55 ${290-.3*240}L475 ${290-.9*240}" stroke="#c59320" stroke-width="3"/><path d="M${55+420*q} 35V290" stroke="#496574" stroke-dasharray="5 4"/><circle cx="${55+420*q}" cy="${290-rowL*240}" r="5" fill="#137d85"/><circle cx="${55+420*q}" cy="${290-rowR*240}" r="5" fill="#c59320"/><text x="60" y="20" font-size="12">进球概率</text><text x="60" y="325" font-size="12">q = 守门员选右概率 0 → 1</text><text x="70" y="260" font-size="12" fill="#137d85">蓝绿：踢左 .6−.4q</text><text x="270" y="260" font-size="12" fill="#a17f22">金色：踢右 .3+.6q</text></svg></div><div><table class="lab-table"><thead><tr><th>保持对方混合不变</th><th>纯左</th><th>纯右</th></tr></thead><tbody><tr><td>踢球者进球率</td><td>${fmt(rowL)}</td><td>${fmt(rowR)}</td></tr><tr><td>守门员对应进球率</td><td>${fmt(colL)}</td><td>${fmt(colR)}</td></tr></tbody></table><div class="lab-log" aria-live="polite"><span class="lang-en">p=.4 makes both goalkeeper columns yield .48; q=.3 makes both kicker rows yield .48. ${eq?'Neither player can improve unilaterally: Nash equilibrium.':'A player can improve by deviating while holding the opponent mix fixed.'}</span><span class="lang-zh">p=.4 使守门员的两列都得到 .48；q=.3 使踢球者两行都得到 .48。
${eq?'当前无人能单方改进，达到 Nash 均衡。':'当前至少一人能获益偏离。比较表格中纯动作与当前进球概率。'}</span></div>${eq?'<div class="equilibrium">NASH EQUILIBRIUM · (p右,q右) = (.4,.3)</div>':''}</div></div><div class="callout">让“对方”无差异：踢球者自己的混合 p 决定守门员是否愿意改列；守门员的混合 q 决定踢球者是否愿意改行。守门员希望进球率降低。</div>`;
 on(root,'#nash-p','change',e=>{p=+e.target.value;draw();});on(root,'#nash-q','change',e=>{q=+e.target.value;draw();});on(root,'#nash-eq','click',()=>{p=.4;q=.3;draw();});on(root,'#nash-random','click',()=>{p=.8;q=.7;draw();});}draw();}
const mounts={search:mountSearch,csp:mountCsp,andor:mountAndor,vi:mountVi,mcts:mountMcts,bandit:mountBandit,td:mountTd,vfa:mountVfa,minimax:mountMinimax,nash:mountNash};
window.LABS={list:LAB_LIST,dispose,mount(id,root){dispose();(mounts[id]||mountSearch)(root);}};
})();
