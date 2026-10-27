'use strict';
(() => {
  const C=window.A3Core,D=window.A3_DATA;if(!C||!D)return;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const T=(zh,en)=>`<span class="bi-text"><span class="lang-zh" lang="zh-CN">${esc(zh)}</span><span class="lang-en" lang="en">${esc(en)}</span></span>`;
  const f=(n,d=3)=>Number.isFinite(n)?Number(n.toFixed(d)).toString():'—';
  const standalone=()=>document.body.hasAttribute('data-a3-standalone');
  const asset=p=>encodeURI((standalone()?'../':'')+p);
  const route=id=>standalone()?'#'+id:'#a3/'+id;
  const LESSONS=[
    ['intro','先让机器人走起来','Meet the rover','状态、动作、奖励到底是什么？'],
    ['table','给动作记一张分数表','Read a Q-table','先认识字典和Q值，不急着背公式。'],
    ['update','亲手改一个Q值','One Q update','先猜结果，再拆开六个小步骤。'],
    ['episode','把步骤连成一幕','An episode and exploration','回放真实代码；看清探索与评估。'],
    ['features','把地图变成21个数字','Build the feature vector','点地图，查看每个数字从哪里来。'],
    ['weights','让一组权重慢慢改变','Update feature weights','点积、误差、权重更新逐项算。'],
    ['evidence','看懂你保存的训练记录','Inspect recorded curves','平均数先从10个小数字讲起。'],
    ['explain','讲给老师听与9次commit','Explain and commit','带着代码、验证和自己的讲解继续。']
  ];
  const COMMITS=[
    ['搭好最小骨架','chore: set up the A3 solver and local runner','从官方starter开始，只完成身份信息、轻量构造函数与本地测试入口。','先能导入Solver；构造时没有训练，没有改环境文件。','__init__','01'],
    ['建立Q表与贪心读取','feat: add Q-table storage and valid greedy selection','实现ql_initialise与ql_select_action；同一状态能找到同一行，动作只从合法集合选。','未见状态也返回合法动作；调用评估方法不会新增Q表行。','ql_select_action','02'],
    ['写对一次Q更新','feat: implement one-step Q-learning and terminal handling','先写一个可手算的样本更新，单独处理真正终止后继。','旧Q=1、r=-2、alpha=.2，终止后新Q应为.4。','ql_train_episode','03'],
    ['连成训练幕并加入探索','feat: add episode training and epsilon decay','实现状态链、合法动作选择、epsilon策略、幕结束和预算交接。','每次动作接前一次返回状态；新一幕从初始状态开始；不吞预算异常。','_epsilon','04'],
    ['留下表格学习的实验记录','test: record tabular learning and fixed-rate experiments','记录每幕奖励、步数和随机种子；用三个固定学习率独立运行。','每组只改变学习率；手算一个50幕平均值，保留全部候选数据。','_record_episode','05'],
    ['实现固定长度特征','feat: add normalised map-based FQ features','写清FEATURE_NAMES、地图距离、地形与收集进度，输出统一归一化向量。','各状态动作对长度一致且不超过256；特征有限；权重初始化全0或全1。','fq_get_features','06'],
    ['实现FQ权重训练','feat: train linear Q weights with TD updates','实现点积与半梯度更新；使用真实奖励，处理终止后继。','零权重、phi=[1,.5]、r=-2、alpha=.1，终止更新应得[-.2,-.1]。','fq_train_episode','07'],
    ['分开训练与评估','feat: separate greedy evaluation and export learned weights','核对两个select_action只贪心读取已学值；记录有名称的特征权重。','评估前后Q表和权重不变，训练步数不增加；工具缓存可以变化。','fq_select_action','08'],
    ['完整验证并整理自己的说明','test: validate levels and document reproducible experiments','运行公开关卡、共同协议对照和检查脚本，补充真实AI使用与验证记录。','报告对应最终代码与实测数据；受限小问独立完成；自己能不照稿追踪一次更新。','ql_train_episode','09']
  ];
  const ACTION_NAMES={wl:'走左',wr:'走右',wu:'走上',wd:'走下',bl:'推进左',br:'推进右',bu:'推进上',bd:'推进下',jl:'跳左',jr:'跳右',ju:'跳上',jd:'跳下'};
  const FEATURE_ZH=['基础项','步行指示','推进指示','跳跃指示','向左','向右','向上','向下','当前目标距离','前方一格目标距离','前方一格进展','前方两格进展','前方四格进展','正前方岩浆','两侧岩浆','正前方岩石','正前方陨石坑','还缺样本比例','已经够样本','前方未收集水晶','前方发射点'];
  const STORAGE='comp3702-a3-unit-v1',IDS=LESSONS.map(x=>x[0]);
  function clean(raw){
    const result={kind:'comp3702-a3-unit',version:1,done:[],commits:[],notes:{},language:'dual'};
    if(!raw||typeof raw!=='object')return result;
    result.done=IDS.filter(id=>Array.isArray(raw.done)&&raw.done.includes(id));
    result.commits=COMMITS.map((_,i)=>i+1).filter(i=>Array.isArray(raw.commits)&&raw.commits.includes(i));
    for(const id of IDS)if(typeof raw.notes?.[id]==='string')result.notes[id]=raw.notes[id].slice(0,10000);
    if(['dual','zh','en'].includes(raw.language))result.language=raw.language;
    return result;
  }
  let progress=clean(null),storageOK=true;try{progress=clean(JSON.parse(localStorage.getItem(STORAGE)||'null'));}catch(_){storageOK=false;}
  let host=null,lesson='intro',timer=null,roverFrame=0,robotPrevious=null,clickListener=null,inputListener=null,changeListener=null,keyListener=null;
  const diceRandom=C.random(3702);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const S={world:{state:C.initial(C.TOY),history:[],reward:0,slip:false,last:null},table:{state:0,values:[[-6,-2,-4,-3],[-4,-1,-5,-2],[-3,-2,-1,-4]],guess:null},
    update:{old:1,reward:-2,gamma:.9,alpha:.2,nextMax:5,terminal:false,stage:0,prediction:'',feedback:''},
    episode:{index:0,phase:0,epsilon:.25,roll:null,histogram:[0,0,0,0],draws:0,explorations:0,mode:'train'},
    features:{map:'L1',state:null,action:'wr',coordinate:0,distances:false},
    weights:{mode:'simple',weights:[0,0,0],reward:-2,gamma:.9,alpha:.1,nextMax:0,terminal:true,stage:0},
    evidence:{run:'learning_rates/L1_ql_alpha0.2',cursor:0,window:3,toyCursor:2},explain:{card:0,revealed:false,present:false}};
  const models=new Map(D.maps.map(map=>[map.id,C.featureModel(map)]));
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify(progress));}catch(_){storageOK=false;const notice=host?.querySelector('[data-a3-storage]');if(notice)notice.hidden=false;} }
  function stop(){if(timer)clearInterval(timer);timer=null;syncPlay();}
  function syncPlay(){host?.querySelectorAll('[data-a3-play]').forEach(b=>{b.innerHTML=T(timer?'暂停':'自动分步',timer?'Pause':'Auto step');b.setAttribute('aria-pressed',String(!!timer));b.disabled=!!reduced?.matches;});const demo=host?.querySelector('[data-a3-action="world-demo"]');if(demo){demo.innerHTML=T(timer?'暂停演示':'看六步演示',timer?'Pause':'Watch six steps');demo.disabled=!!reduced?.matches;}}
  function play(next,finished){
    if(timer){stop();return;}if(reduced?.matches)return;
    timer=setInterval(()=>{if(!host?.isConnected||document.hidden||reduced?.matches||finished()){stop();return;}next();},850);syncPlay();
  }
  function stat(key,value){return `<span data-count-key="a3-${key}" data-count-value="${value}"><span class="number-final">${value}</span></span>`;}
  function button(action,zh,en,primary=false,extra=''){return `<button type="button" data-a3-action="${action}" class="${primary?'primary':''}" ${extra}>${T(zh,en)}</button>`;}
  function field(id,zh,en,value,opts={}){return `<label class="a3-field" for="a3-${id}">${T(zh,en)}<input id="a3-${id}" data-a3-field="${id}" type="${opts.type||'number'}" value="${value}" min="${opts.min??-1000}" max="${opts.max??1000}" step="${opts.step??.1}"><output id="a3-out-${id}">${f(Number(value))}</output></label>`;}
  const steps=(names,index)=>`<ol class="a3-steps">${names.map((name,i)=>`<li class="${i===index?'current':i<index?'past':''}"><span>${i+1}</span>${esc(name)}</li>`).join('')}</ol>`;
  const metric=(name,value,sub='')=>`<div class="a3-metric"><span>${name}</span><strong>${value}</strong>${sub?`<small>${sub}</small>`:''}</div>`;
  function mapById(){return D.maps.find(m=>m.id===S.features.map);}
  function featureState(){const map=mapById();if(!S.features.state)S.features.state=C.initial(map);return S.features.state;}
  function featureData(){return models.get(S.features.map).features(featureState(),S.features.action);}
  function board(map,state,{interactive=false,distances=null,animate=false}={}){
    const label=(r,c)=>{
      const crystal=map.crystals.findIndex(p=>p[0]===r&&p[1]===c),launch=map.launches.some(p=>p[0]===r&&p[1]===c),terrain=C.tile(map,r,c);
      return crystal>=0&&!state.crystals[crystal]?'◆':launch?'E':terrain==='R'?'':terrain==='L'?'≈':terrain==='*'?'○':distances?f(distances([r,c]),0):'';
    };
    const previous=animate&&robotPrevious?.map===map.id?robotPrevious:state;
    const cells=map.grid.flatMap((row,r)=>Array.from(row).map((_,c)=>{
      const terrain=C.tile(map,r,c),text=label(r,c),tag=interactive?'button':'div';
      return `<${tag} ${interactive?`type="button" data-a3-cell="${r},${c}" ${['R','L'].includes(terrain)?'disabled':''}`:''} class="a3-cell tile-${terrain===' '||terrain==='C'?'ground':terrain} ${r===state.row&&c===state.col?'rover-cell':''}" aria-label="${r},${c} ${terrain==='R'?'岩石':terrain==='L'?'岩浆':terrain==='*'?'陨石坑':text==='◆'?'水晶':text==='E'?'发射点':'地面'}">${text}</${tag}>`;
    })).join('');
    return `<div class="a3-board" style="--cols:${map.cols};--rows:${map.rows}" role="group" ${interactive?'':'tabindex="0"'} aria-label="${map.id} 地图"><div class="a3-board-cells">${cells}</div><div class="a3-rover" aria-hidden="true" data-target-row="${state.row}" data-target-col="${state.col}" data-map="${map.id}" style="width:${100/map.cols}%;height:${100/map.rows}%;left:${previous.col/map.cols*100}%;top:${previous.row/map.rows*100}%"><svg viewBox="0 0 40 40"><path d="M10 14h20v15H10zM15 9h10v5H15z"/><circle cx="13" cy="31" r="3"/><circle cx="27" cy="31" r="3"/><path d="M14 19h4m5 0h3"/></svg></div></div>`;
  }
  function animateRobot(){
    if(roverFrame)cancelAnimationFrame(roverFrame);
    const rover=host?.querySelector('.a3-rover');if(!rover)return;
    const row=+rover.dataset.targetRow,col=+rover.dataset.targetCol,map=rover.dataset.map;
    const model=map==='classroom'?C.TOY:D.maps.find(m=>m.id===map);
    const apply=()=>{if(!rover.isConnected)return;rover.style.left=col/model.cols*100+'%';rover.style.top=row/model.rows*100+'%';};
    if(reduced?.matches)apply();else{rover.getBoundingClientRect();roverFrame=requestAnimationFrame(apply);}
    robotPrevious={map,row,col};
  }
  function sourcePane(name,token=''){
    const section=D.sections[name]||D.sections.ql_train_episode;
    let index=section.lines.findIndex(l=>token&&l.text.includes(token));if(index<0)index=0;
    const start=Math.max(0,index-3),lines=section.lines.slice(start,Math.min(section.lines.length,start+10));
    return `<div class="a3-code-head">${T('对照你的Python代码','Your Python source')}<small>${esc(section.file||'solution.py')} · ${section.start}–${section.end}</small></div><ol class="a3-code-lines">${lines.map(line=>`<li class="${line===section.lines[index]?'current':''}"><span>${line.number}</span><code>${esc(line.text)}</code></li>`).join('')}</ol><details class="a3-full-source"><summary>${T('展开整个函数','Show the complete function')}</summary><pre>${esc(section.lines.map(l=>String(l.number).padStart(3)+'  '+l.text).join('\n'))}</pre></details><a href="${asset('assignments/a3/'+(section.file||'code/solution.py'))}" download>${T('下载对应源码','Download this source')}</a>`;
  }
  function lessonCode(){
    if(lesson==='intro')return ['__init__','self.game_env'];
    if(lesson==='table')return ['ql_select_action','return max'];
    if(lesson==='update')return ['ql_train_episode',['next_state, reward','target = reward','target +=','target +=','row[index] +=','row[index] +='][S.update.stage]];
    if(lesson==='episode')return [S.episode.mode==='evaluate'?'ql_select_action':'ql_train_episode',['get_init_state','action =','perform_action','target =','row[index] +=','state = next_state'][S.episode.phase]];
    if(lesson==='features')return ['fq_get_features',S.features.coordinate<8?'values =':S.features.coordinate<13?'distances =':'norm ='];
    if(lesson==='weights')return ['fq_train_episode',['values =','target = reward','error =','self.fq_weights[i] +='][S.weights.stage]];
    if(lesson==='evidence')return ['moving_average','result.append'];
    return [COMMITS[S.explain.card][4]||'ql_train_episode',''];
  }
  function chrome(){
    const current=LESSONS.find(l=>l[0]===lesson)||LESSONS[0];
    host.innerHTML=`<section class="a3-unit ${S.explain.present?'is-presenting':''}"><div class="a3-unit-top"><div><div class="eyebrow">A3 / ZERO TO EXPLAIN</div><h1>${T('从第一步，到能讲清代码','From your first step to explaining the code')}</h1><p>${T('不用先懂AI。先动手、再看数字，最后回到同一段Python。','Start with actions, inspect the numbers, then return to the matching Python.')}</p></div><div class="a3-unit-links"><a class="button" href="${asset('a3/index.html')}">${T('独立打开A3单元','Open the standalone A3 unit')}</a><a class="button" href="${asset('index.html#assignments/a3')}">${T('代码与报告资料','Code and report archive')}</a><button type="button" data-a3-action="present">${T(S.explain.present?'退出讲解布局':'讲解布局',S.explain.present?'Exit presentation layout':'Presentation layout')}</button></div></div><p class="a3-callout" data-a3-storage ${storageOK?'hidden':''}>${T('浏览器暂不能保存记录；学习结束前请点“备份本单元记录”。','Browser storage is unavailable. Export a unit backup before leaving.')}</p><div class="a3-progress"><span>${T('闭卷会讲才标记掌握','Mark mastery after explaining unaided')}</span><strong>${stat('unit-done',progress.done.length)} / ${LESSONS.length}</strong><div><i style="width:${progress.done.length/LESSONS.length*100}%"></i></div></div><div class="a3-unit-shell"><nav class="a3-lesson-nav" aria-label="A3学习步骤">${LESSONS.map((l,i)=>`<a href="${route(l[0])}" class="${lesson===l[0]?'active':''} ${progress.done.includes(l[0])?'done':''}"><span>${progress.done.includes(l[0])?'✓':String(i+1).padStart(2,'0')}</span>${T(l[1],l[2])}</a>`).join('')}<a href="${asset('docs/20_A3九个Commit里程碑.md')}" download>${T('下载9个commit点','Download the nine milestones')}</a></nav><div class="a3-main-column"><header class="a3-lesson-head"><span class="eyebrow">${String(IDS.indexOf(lesson)+1).padStart(2,'0')} / ${esc(current[2])}</span><h2>${T(current[1],current[2])}</h2><p>${esc(current[3])}</p></header><div class="a3-workspace"><div><div id="a3-controls" class="a3-controls"></div><div id="a3-scene" class="a3-scene"></div></div><aside id="a3-source" class="a3-source"></aside></div><section class="a3-notes"><label for="a3-my-notes">${T('用你自己的话记一句','Write one sentence in your own words')}</label><textarea id="a3-my-notes" data-a3-note placeholder="先说你观察到了什么，再说是哪一行代码改变了它。">${esc(progress.notes[lesson]||'')}</textarea><div class="button-row">${button('complete',progress.done.includes(lesson)?'取消本节掌握标记':'我能不照稿讲清这一节',progress.done.includes(lesson)?'Unmark mastery':'I can explain this unaided',true)}${button('backup','备份本单元记录','Back up this unit')}${button('notes','导出我的讲解笔记','Export my notes')}<label class="button" for="a3-unit-import">${T('导入本单元记录','Import unit progress')}</label><input class="sr-only" id="a3-unit-import" type="file" accept="application/json"></div></section><div class="a3-next-row">${IDS.indexOf(lesson)>0?`<a class="button" href="${route(IDS[IDS.indexOf(lesson)-1])}">← ${T('上一节','Previous')}</a>`:'<span></span>'}${IDS.indexOf(lesson)<IDS.length-1?`<a class="button primary" href="${route(IDS[IDS.indexOf(lesson)+1])}">${T('下一节','Next')} →</a>`:''}</div><p class="a3-origin-note">${T('课堂模型、真实样本和真实训练记录分别标注。演示不是自动评分，也不替你执行Git提交。','Classroom models, real recorded transitions and experimental records are labelled separately. This unit neither grades your work nor creates Git commits.')}</p></div></div></section>`;
    drawControls();refresh();
  }

  function drawControls(){
    let html='';
    if(lesson==='intro')html=`<div class="a3-label">${T('课堂小地图：先按向右三次，观察水晶状态。','Classroom map: press Right three times and inspect crystal status.')}</div><div class="a3-direction-pad">${[['u','↑','向上'],['l','←','向左'],['d','↓','向下'],['r','→','向右']].map(([d,a,t])=>`<button type="button" data-a3-direction="${d}">${a} ${T(t,d.toUpperCase())}</button>`).join('')}</div><div class="button-row">${button('world-reset','从起点重来','Restart')}${button('world-demo','看六步演示','Watch six steps')}<label><input type="checkbox" data-a3-field="world-slip" ${S.world.slip?'checked':''}> ${T('加一点随机偏移','Add classroom randomness')}</label></div>`;
    if(lesson==='table')html=`<label class="a3-field">${T('先选择要查的状态','Choose a dictionary key')}<select data-a3-field="table-state">${['同一位置，水晶[0,0]','同一位置，水晶[1,0]','另一位置，水晶[1,0]'].map((x,i)=>`<option value="${i}" ${S.table.state===i?'selected':''}>${x}</option>`).join('')}</select></label><div class="a3-fields">${S.table.values[S.table.state].map((q,i)=>field('table-'+i,ACTION_NAMES[C.ACTIONS[i]],C.ACTIONS[i],q,{type:'range',min:-12,max:8,step:1})).join('')}</div>${button('table-reset','恢复教学分数','Reset classroom values')}`;
    if(lesson==='update'){
      const u=S.update;
      html=`<div class="a3-fields">${field('u-old','原来记的Q值','Old Q',u.old)}${field('u-reward','刚收到的奖励','Observed reward',u.reward)}${field('u-next','下一状态最大Q','Max next Q',u.nextMax)}${field('u-alpha','这次改多少 alpha','Learning rate alpha',u.alpha,{type:'range',min:0,max:1,step:.05})}${field('u-gamma','未来打几折 gamma','Discount gamma',u.gamma,{type:'range',min:0,max:1,step:.01})}</div><label><input type="checkbox" data-a3-field="u-terminal" ${u.terminal?'checked':''}> ${T('下一状态真正终止','The next state is terminal')}</label><div class="a3-predict"><label for="a3-prediction">${T('先猜更新后的Q值','Predict the updated Q')}</label><input type="number" id="a3-prediction" data-a3-field="prediction" step="any" value="${esc(u.prediction)}" placeholder="先手算，再核对">${button('prediction','核对我的计算','Check my calculation')}</div><div class="button-row">${button('back','上一步','Back')}${button('next','下一小步','Next step',true)}<button type="button" data-a3-action="play" data-a3-play></button>${button('reset','重置步骤','Reset steps')}</div>`;
    }
    if(lesson==='episode')html=`<label class="a3-field">${T('选择一个真实录制样本','Choose a real recorded transition')}<input type="range" min="0" max="${D.trace.length-1}" step="1" value="${S.episode.index}" data-a3-field="trace-index"><output id="a3-out-trace-index">${S.episode.index+1} / ${D.trace.length}</output></label><div class="button-row">${button('back','上一步','Back')}${button('next','下一小步','Next step',true)}<button type="button" data-a3-action="play" data-a3-play></button>${button('reset','从样本1开始','Start at sample 1')}</div><details class="a3-experiment"><summary>${T('再看：epsilon怎样选动作？','Also try: how epsilon selects an action')}</summary><p>${T('这个骰子独立演示选动作规则，不修改上面的真实录制。','This dice demo does not alter the real recording above.')}</p>${field('epsilon','骰子教学epsilon','Classroom epsilon',S.episode.epsilon,{type:'range',min:0,max:1,step:.05})}<label><select data-a3-field="decision-mode"><option value="train" ${S.episode.mode==='train'?'selected':''}>训练时选动作 / Training choice</option><option value="evaluate" ${S.episode.mode==='evaluate'?'selected':''}>评估时选动作 / Evaluation choice</option></select></label><div class="button-row">${button('roll','掷一次骰子','One draw')}${button('roll100','试100次','Try 100 draws')}${button('roll-reset','清空计数','Clear counts')}</div><div id="a3-dice-result"></div></details>`;
    if(lesson==='features'){
      const map=mapById(),state=featureState(),actions=C.validActions(map,state);if(!actions.includes(S.features.action))S.features.action=actions[0];
      html=`<div class="a3-fields"><label class="a3-field">${T('作业地图','Assignment map')}<select data-a3-field="feature-map">${D.maps.map(m=>`<option value="${m.id}" ${m.id===map.id?'selected':''}>${m.id}</option>`).join('')}</select></label><label class="a3-field">${T('研究哪个合法动作','Inspect a valid action')}<select data-a3-field="feature-action">${actions.map(a=>`<option value="${a}" ${a===S.features.action?'selected':''}>${a} · ${ACTION_NAMES[a]}</option>`).join('')}</select></label></div><div class="a3-crystal-switches">${map.crystals.map((p,i)=>`<label><input type="checkbox" data-a3-crystal="${i}" ${state.crystals[i]?'checked':''} ${p[0]===state.row&&p[1]===state.col?'disabled':''}> C${i+1} (${p})</label>`).join('')}</div><div class="button-row"><label><input type="checkbox" data-a3-field="feature-distances" ${S.features.distances?'checked':''}> ${T('格子上显示目标距离','Show target distance')}</label>${button('next','看下一个特征','Next feature')}<button type="button" data-a3-action="play" data-a3-play></button></div>`;
    }
    if(lesson==='weights'){
      const w=S.weights;
      html=`<label class="a3-field">${T('从简单例子开始，再切换真实特征','Start simple, then use the real features')}<select data-a3-field="weight-mode"><option value="simple" ${w.mode==='simple'?'selected':''}>3维课堂算术 / Three classroom coordinates</option><option value="real" ${w.mode==='real'?'selected':''}>上一课的21维归一化特征 / The previous lesson's 21 features</option></select></label><div class="a3-fields">${field('w-reward','刚收到的奖励','Reward',w.reward)}${field('w-next','下一状态最大Q','Max next Q',w.nextMax)}${field('w-alpha','学习率alpha','Learning rate',w.alpha,{type:'range',min:0,max:1,step:.05})}${field('w-gamma','折扣gamma','Discount',w.gamma,{type:'range',min:0,max:1,step:.01})}</div><label><input type="checkbox" data-a3-field="w-terminal" ${w.terminal?'checked':''}> ${T('下一状态终止','Terminal next state')}</label><div class="button-row">${button('back','上一步','Back')}${button('next','下一小步','Next step',true)}<button type="button" data-a3-action="play" data-a3-play></button>${button('weights-apply','把这次更新写入权重','Apply this update')}${button('reset','权重全部归零','Zero the weights')}</div>`;
    }
    if(lesson==='evidence'){
      const c=D.curves.find(c=>c.id===S.evidence.run)||D.curves[0];
      html=`<label class="a3-field">${T('选择一条已有实验记录','Select an existing recorded run')}<select data-a3-field="curve-run">${D.curves.map(c=>`<option value="${c.id}" ${c.id===S.evidence.run?'selected':''}>${esc(c.id)}</option>`).join('')}</select></label><label class="a3-field">${T('拖动，查看记录中的训练时刻','Scrub through recorded training')}<input type="range" min="0" max="${c.points.length-1}" step="1" value="${S.evidence.cursor}" data-a3-field="curve-cursor"><output id="a3-out-curve-cursor">${S.evidence.cursor+1} / ${c.points.length}</output></label><div class="button-row">${button('next','看下一时刻','Next recorded point')}<button type="button" data-a3-action="play" data-a3-play></button>${button('curve-all','显示整条曲线','Reveal the whole curve')}</div><details class="a3-experiment" open><summary>${T('平均数不懂？先用10个数练习','New to averages? Try ten small numbers')}</summary><div class="a3-fields">${field('ma-window','平均最近几幕','Window length',S.evidence.window,{type:'range',min:1,max:5,step:1})}${field('ma-cursor','走到第几幕','Current episode',S.evidence.toyCursor+1,{type:'range',min:1,max:10,step:1})}</div><div id="a3-ma-demo"></div></details>`;
    }
    if(lesson==='explain')html=`<div class="a3-callout">${T('9个commit点对应真实的新进展。先自己实现、验证，再提交；不要把完整参考实现拆成9次凑数。下面的勾选只是学习记录，不会运行Git。','These nine points represent genuine new progress. Implement and verify your own changes before committing. The checkboxes do not run Git.')}</div><label class="a3-field">${T('选择要解释的开发阶段','Choose a development milestone')}<select data-a3-field="commit-index">${COMMITS.map((c,i)=>`<option value="${i}" ${i===S.explain.card?'selected':''}>${i+1}. ${c[0]}</option>`).join('')}</select></label>`;
    host.querySelector('#a3-controls').innerHTML=html;syncPlay();
  }
  function worldScene(){
    const w=S.world,last=w.last,done=C.terminal(C.TOY,w.state),collected=w.state.crystals.reduce((a,b)=>a+b,0);
    return `<span class="a3-badge">${T('课堂简化模型','Classroom model')}</span><div class="a3-split">${board(C.TOY,w.state,{animate:true})}<div class="a3-state-card"><h3>${T('状态就是机器人此刻的资料卡','A state is the rover’s current information card')}</h3><div class="a3-metrics">${metric('位置 / position',`(${w.state.row}, ${w.state.col})`)}${metric('水晶 / crystals',`[${w.state.crystals}]`)}${metric('上一步reward',last?f(last.reward):'—')}${metric('本幕总reward',f(w.reward))}</div><p>${T('◆是水晶，E是出口，○是坑，≈是岩浆。拿水晶会改状态，不额外加奖励。','◆ crystal, E launch, ○ crater, ≈ lava. Collecting a crystal changes the state, without an extra reward.')}</p><div class="a3-status" role="status">${done?T(C.tile(C.TOY,w.state.row,w.state.col)==='L'?'进入岩浆，这一幕结束。':'样本够了并到达出口，这一幕结束。','This episode has ended.'):last?T(`你想${ACTION_NAMES[last.action]}；实际向${last.result.actual}，奖励${last.reward}${last.result.blocked?'，撞到岩石':''}。`,`Observed reward: ${last.reward}.`):T('先点向右。现在还没有发生动作。','Press Right. No action has occurred yet.')}</div><p>${T(`当前拿到${collected}颗，需要${C.TOY.minSamples}颗。位置相同、水晶记录不同，也属于不同状态。`,'The same position with different crystal status represents a different state.')}</p></div></div><details class="a3-experiment"><summary>${T('这些英文和Python符号是什么意思？','What do these words and Python symbols mean?')}</summary><div class="a3-glossary">${[
      ['state 状态','不是一张地图，而是位置与收集记录等当前信息。'],['action 动作','你尝试让机器人做的事，例如wr向右走。'],['reward 奖励','环境返回的一个数。-1比-2大，负数也能用来比较。'],['episode 一幕','从起点开始，到终止或截断的一段交互。'],['变量 = 有名字的盒子','state = ... 表示把一个值放到名为state的变量里。'],['函数 = 一个小步骤','perform_action(state, action) 接收两个输入并返回结果。'],['字典 = 按键查记录','q_table[state] 按状态找到一行Q值。'],['列表 = 有顺序的一排数','[0, 1] 用第0、第1项记录两颗水晶。'],['if / for','if判断条件；for重复一段代码。'],['class / self / __init__','class把相关资料和函数放在一起。self指这一个Solver对象；__init__在创建它时执行，把传进来的game_env记住。'],['return / 多个返回值','return把计算结果交回调用处。next_state, reward, _把三个返回值分别接住；下划线表示这里不用第三项。'],['None / max','None表示暂时没有那个值。max从一组数字或动作中挑最大的。']].map(([a,b])=>`<details><summary>${esc(a)}</summary><p>${esc(b)}</p></details>`).join('')}</div></details><p class="a3-small">${T('本课固定步行成本1、撞墙总成本1.5、岩浆单步奖励-10；可选偏移概率25%。这些是课堂规则，不是A3隐藏参数。坑内方向键表示跳出；本课不模拟boost。','Classroom rules: step cost 1, blocked cost 1.5, lava reward -10; optional 25% drift. These are not the assignment’s hidden parameters. Direction buttons jump inside a crater; boosts are omitted here.')}</p>`;
  }
  function tableScene(){
    const values=S.table.values[S.table.state],chosen=C.choose(values,0,1,.5,'evaluate').index;
    return `<span class="a3-badge">${T('教学填入的分数，不是实验成绩','Classroom values, not experimental results')}</span><p>${T('Q值可以先理解为：在这个状态尝试这个动作，我目前估计能得到多少后续回报。先看这一行，不需要认识公式。','Read a Q-value as a current estimate of the return from an action in this state.')}</p><div class="a3-dictionary"><span>q_table[state]</span><span>→</span><strong>[${values.map(v=>f(v)).join(', ')}]</strong></div><div class="a3-q-cells">${values.map((v,i)=>`<button type="button" data-a3-guess="${i}" class="${S.table.guess!==null&&chosen===i?'selected':''}"><span>${ACTION_NAMES[C.ACTIONS[i]]} / ${C.ACTIONS[i]}</span><strong>${v}</strong><i style="--amount:${Math.min(100,Math.abs(v)/12*100)}%"></i></button>`).join('')}</div><div class="a3-status" role="status">${S.table.guess===null?T('先点你觉得这份贪心评估函数会选择的动作。','Click the action you expect the greedy evaluation method to choose.'):T(`你选了${C.ACTIONS[S.table.guess]}。这份函数会选${C.ACTIONS[chosen]}：${values[chosen]}是最大值；并列时按合法动作顺序取第一个。`,`This method selects ${C.ACTIONS[chosen]}, whose Q-value is maximal; ties use the first valid action.`)}</div><p>${T('负数不是越小越好：-2比-6大。这里用max挑回报估计最大的动作。切换上面的状态，你会查到另一行，而不是覆盖原来一行。','A less negative value can be larger: -2 exceeds -6. Switching the state selects another dictionary row.')}</p>`;
  }
  function updateScene(){
    const u=S.update,x=C.qUpdate(u.old,u.reward,u.gamma,u.alpha,u.nextMax,u.terminal);
    const formulas=[['拿到一个样本',`Q旧=${f(x.old)}；r=${f(x.reward)}；下一状态最大Q=${f(x.nextMax)}`],['看是否真正终止',u.terminal?'已终止 → 不再接未来回报':`未终止 → 未来部分=${f(x.gamma)} × ${f(x.nextMax)} = ${f(x.continuation)}`],['算目标target',`${f(x.reward)} + ${f(x.continuation)} = ${f(x.target)}`],['算差距TD error',`${f(x.target)} − ${f(x.old)} = ${f(x.error)}`],['只改差距的一部分',`${f(x.alpha)} × ${f(x.error)} = ${f(x.change)}`],['写回这一个Q值',`${f(x.old)} + ${f(x.change)} = ${f(x.value)}`]];
    return `${steps(['样本','终止?','目标','差距','改多少','写回'],u.stage)}<div class="a3-formula-rule"><code>target = r + gamma × max_next_Q</code><code>new_Q = old_Q + alpha × (target − old_Q)</code></div><div class="a3-calculation-list">${formulas.map(([title,calculation],i)=>`<div class="${i===u.stage?'current':''}"><span>${i+1}. ${title}</span><strong>${i<=u.stage?esc(calculation):'下一小步揭开 / Next step'}</strong></div>`).join('')}</div>${u.feedback?`<div class="a3-status" role="status">${esc(u.feedback)}</div>`:''}<p>${T('alpha决定这次向目标移动多少；gamma只乘未来部分。终止不是“奖励必定为0”，而是后面没有继续得到奖励的部分。单次样本不会证明已经学会整关。','Alpha scales this adjustment. Gamma discounts the future part. Terminal means no continuation, not necessarily a zero immediate reward.')}</p>`;
  }
  function diceScene(){
    const e=S.episode,values=[-6,-2,-4,-3],last=e.roll;
    return `<div class="a3-dice-meter"><i style="width:${e.mode==='evaluate'?0:e.epsilon*100}%"></i>${last?`<b style="left:${last.roll*100}%"></b>`:''}</div><p>${e.mode==='evaluate'?T('评估忽略epsilon，只选当前最大Q；示例Q表保持不变。','Evaluation ignores epsilon and selects the greedy action.'):T(`随机数u小于${f(e.epsilon)}时探索；否则用当前Q值选动作。`,`Explore if the random draw is below ${f(e.epsilon)}.`)}</p><div class="a3-status" role="status">${last?T(`u=${f(last.roll,4)} → ${last.explored?'探索':'贪心'} → ${C.ACTIONS[last.index]}。`,`u=${f(last.roll,4)} → ${last.branch} → ${C.ACTIONS[last.index]}.`):T('点“掷一次骰子”观察一次分支。','Draw once to inspect the branch.')}</div><div class="a3-histogram">${values.map((v,i)=>`<div><span>${C.ACTIONS[i]} · Q=${v}</span><i style="width:${e.draws?e.histogram[i]/e.draws*100:0}%"></i><b>${e.histogram[i]}</b></div>`).join('')}</div><p>${T(`共${e.draws}次选择，其中${e.explorations}次走探索分支。100次试验不保证恰好epsilon×100次探索；贪心并列在训练中也会随机打破。`,`There were ${e.draws} draws and ${e.explorations} exploration branches. A finite trial need not match epsilon exactly.`)}</p>`;
  }
  function episodeScene(){
    const e=S.episode,r=D.trace[e.index],map=D.maps[0],shown=e.phase>=2?r.next:r.state;
    return `<span class="a3-badge">${T('真实代码交互录制，只回放','Recorded from the real Python solver')}</span><p>${T('为看清过程，这次录制每幕最多12步、总预算24步，其他动作与奖励由公开环境接口产生。动画只连接起点和终点，不表示中间运动轨迹。录制没有记录探索分支，下面骰子另作教学演示。','This recording uses 12-step episodes and a 24-step budget. Outcomes come from the public simulator API; the animation connects endpoints rather than reconstructing intermediate motion. It does not label the exploration branch.')}</p>${steps(['起始状态','选动作','交给环境','算目标','更新Q','接下一步'],e.phase)}<div class="a3-split">${board(map,shown,{animate:true})}<div><div class="a3-metrics">${metric('样本 / sample',`${e.index+1}/24`)}${metric('第几幕 / episode',r.episode)}${metric('录制这幕epsilon',f(r.epsilon,5))}${metric('本次动作 / action',r.action)}</div><div class="a3-calculation-list"><div><span>state</span><strong>(${r.state.row},${r.state.col}), [${r.state.crystals}]</strong></div><div><span>perform_action →</span><strong>${e.phase>=2?`(${r.next.row},${r.next.col}), reward=${f(r.reward,5)}`:'下一步观察'}</strong></div><div><span>target</span><strong>${e.phase>=3?f(r.target,6):'尚未计算'}</strong></div><div><span>Q[${r.action}]</span><strong>${f(r.oldQ,5)} → ${e.phase>=4?f(r.newQ,5):'尚未更新'}</strong></div></div></div></div><div class="a3-q-mini">${r.valid.map((a,i)=>`<div class="${a===r.action?'current':''}"><span>${a}</span><strong>${f(a===r.action&&e.phase>=4?r.newQ:r.qBefore[i],3)}</strong></div>`).join('')}</div><div class="a3-budget"><span>${T('已使用动作预算','Training steps used')}: ${e.phase>=2?r.step:r.step-1} / 24</span><i style="width:${(e.phase>=2?r.step:r.step-1)/24*100}%"></i></div><p>${T(e.index===11&&e.phase===5?'这一幕达到12步上限；总预算还有12步。下一幕会回到初始状态，但保留学到的Q表。':e.index===23&&e.phase===5?'这次24步录制结束。实际训练由harness接管预算异常，求解器不捕获它。':'state = next_state把环境返回的状态接给下一次交互。它不是把机器人随意放到地图某处。','The next action uses the returned successor. A new episode resets position but retains the learned Q-table.')}</p>`;
  }
  function featureExplanation(i,x,map,state){
    if(i===0)return '原始基础项为1，再和整条向量一起除以范数。';
    if(i<=7)return `检查动作${S.features.action}的类型或方向，条件成立记1，否则记0。`;
    if(i===8||i===9)return `地图距离${f(i===8?x.current:x.future[0])}，除以行列和${map.rows+map.cols}，并最多取1。`;
    if(i<=12)return `用当前距离减前方${[1,2,4][i-10]}格的距离，再除以${map.rows+map.cols}。两格和四格只对boost启用。`;
    if(i===13)return '正前方一格是岩浆记1，否则记0。';
    if(i===14)return '两侧邻格各检查一次是否岩浆，两个0/1取平均。';
    if(i===15||i===16)return `正前方一格是${i===15?'岩石':'陨石坑'}记1，否则记0。`;
    if(i===17)return `还缺max(0, ${map.minSamples} − ${state.crystals.reduce((a,b)=>a+b,0)})颗，再除以最低要求${map.minSamples}。`;
    if(i===18)return '已收集数量达到最低要求记1，否则记0。';
    return i===19?'前方一格对应尚未收集的水晶记1。':'样本数量足够，而且前方一格是发射点时记1。';
  }
  function featuresScene(){
    const map=mapById(),state=featureState(),x=featureData(),i=S.features.coordinate;
    return `<span class="a3-badge">${T('按参考代码重算，与Python样本核对','Recomputed and checked against Python fixtures')}</span><p>${T('点一个可通行格子，只是在选择要研究的状态，不是在执行动作。站到水晶格会将这颗记为已收集；在坑里只能选择jump。','Click a traversable tile to inspect a state, not to execute a transition. A crystal under the rover is marked collected; crater actions are jumps.')}</p><div class="a3-split">${board(map,state,{interactive:true,distances:S.features.distances?x.distanceAt:null})}<div class="a3-state-card"><div class="a3-metrics">${metric('state',`(${state.row},${state.col}) [${state.crystals}]`)}${metric('action',S.features.action)}${metric('目标 / target',x.ready?'发射点 / launch':'未收集水晶')} ${metric('归一化范数',f(x.norm,5))}</div><div class="a3-feature-focus"><span>${i}. ${FEATURE_ZH[i]}</span><code>${C.FEATURE_NAMES[i]}</code><p>${esc(featureExplanation(i,x,map,state))}</p><strong>${f(x.raw[i],6)} ÷ ${f(x.norm,6)} = ${f(x.normalised[i],6)}</strong></div></div></div>${C.terminal(map,state)?`<p class="a3-callout">${T('这个状态已经终止；训练代码不会继续选动作。这里仍可检查特征函数的输出。','This state is terminal. Training would stop here; the feature function can still be inspected.')}</p>`:''}<details class="a3-experiment"><summary>${T('向量和归一化是什么？','What are vectors and normalisation?')}</summary><p>${T('特征是描述状态与动作的一条线索，比如前方是否有岩石。向量就是按固定顺序放好的一排数字。把[1,2]各项平方再求和，得到5；开平方约2.236，这就是长度（范数）。每项都除以2.236，变成约[.447,.894]，相对比例保持不变。代码用max(1,范数)，小向量不会被放大。','A feature is a descriptor. A vector is an ordered list of numbers. For [1,2], the square root of 1²+2² is about 2.236. Dividing both coordinates gives [.447,.894] with the same proportions. max(1,norm) avoids enlarging small vectors.')}</p></details><h3>${T('这21个数字按固定顺序排成向量','The 21 coordinates have a fixed order')}</h3><div class="a3-feature-vector">${x.normalised.map((v,j)=>`<button type="button" data-a3-feature="${j}" class="${j===i?'selected':''}"><span>${j} · ${FEATURE_ZH[j]}</span><code>${f(v,4)}</code><i style="width:${Math.min(100,Math.abs(v)*100)}%"></i></button>`).join('')}</div><p>${T('归一化处理整条向量，因此原来为1的基础项，处理后通常不再等于1。这些数字描述地图，没有读取隐藏概率或成本。','Normalising the entire vector also changes the bias coordinate. These descriptors do not read hidden probabilities or costs.')}</p>`;
  }
  function weightsData(){const w=S.weights,phi=w.mode==='simple'?[1,.5,-.25]:featureData().normalised;if(w.weights.length!==phi.length)w.weights=phi.map(()=>0);return C.weightUpdate(w.weights,phi,w.reward,w.gamma,w.alpha,w.nextMax,w.terminal);}
  function weightsScene(){
    const w=S.weights,x=weightsData(),names=w.mode==='simple'?['基础项','特征1','特征2']:C.FEATURE_NAMES;
    const rows=x.features.map((v,i)=>`<tr><th>${i} · ${esc(names[i])}</th><td>${f(v,5)}</td><td>${f(x.weights[i],5)}</td><td>${f(v*x.weights[i],5)}</td><td>${w.stage>=3?f(x.changes[i],5):'—'}</td><td>${w.stage>=3?f(x.nextWeights[i],5):'—'}</td></tr>`).join('');
    return `<span class="a3-badge">${T(w.mode==='simple'?'3维未归一化课堂算术':'上一课的真实21维特征',w.mode==='simple'?'Three unnormalised classroom coordinates':'The previous lesson’s 21 actual feature coordinates')}</span>${steps(['先算Q','算目标','算误差','逐项改权重'],w.stage)}<div class="a3-metrics">${metric('Q旧 = Σ wᵢφᵢ',f(x.old,6))}${metric('target',w.stage>=1?f(x.target,6):'—')}${metric('TD error',w.stage>=2?f(x.error,6):'—')}${metric('更新后同一对(s,a)的Q',w.stage>=3?f(x.nextQ,6):'—')}</div><details class="a3-experiment"><summary>${T('φ、w、Σ和点积，先用一句话认识','Meet phi, weights, sums and dot products')}</summary><p>${T('φ（phi）就是上一课的特征数字，w是训练会改动的数字。把每个w和同位置的φ相乘，再全部加起来，就叫点积；Σ表示全部加起来，i表示第几项。例如w=[2,-1]、φ=[.5,.25]，Q=2×.5+(-1)×.25=.75。TD误差就是目标减掉旧估计；它告诉这次估计差了多少。','Phi contains feature coordinates; w contains the learned coefficients. Multiply matching coordinates and add them: that is a dot product. Sigma means sum; i identifies a coordinate. For w=[2,-1] and phi=[.5,.25], Q=.75. The TD error is the target minus the old estimate.')}</p></details><div class="a3-formula-rule"><code>Q(s,a) = Σ wᵢ × φᵢ(s,a)</code><code>wᵢ_new = wᵢ + alpha × TD_error × φᵢ</code></div><div class="a3-table-scroll"><table><thead><tr><th>坐标 / coordinate</th><th>φ</th><th>原权重w</th><th>w×φ</th><th>改变量</th><th>新权重</th></tr></thead><tbody>${rows}</tbody></table></div><p>${T('先算所有旧值，再算同一个误差，最后更新每个权重。点“写入”才把新权重保存到这个课堂演示中；它不会修改Python文件或真实训练结果。','Compute from the old values before updating coordinates. Apply saves only this classroom demonstration, not the Python solver or recorded experiments.')}</p><div class="a3-weight-strips">${x.weights.slice(0,8).map((v,i)=>`<div><span>w${i}</span><i style="width:${Math.min(100,Math.abs(w.stage>=3?x.nextWeights[i]:v)*100)}%"></i><b>${f(w.stage>=3?x.nextWeights[i]:v,4)}</b></div>`).join('')}</div>`;
  }
  function movingDemo(){const rewards=[-12,-8,-14,-5,-7,-6,-10,-4,-3,-5],e=S.evidence,start=Math.max(0,e.toyCursor-e.window+1),active=rewards.slice(start,e.toyCursor+1),mean=active.reduce((a,b)=>a+b,0)/active.length;return `<div class="a3-reward-chips">${rewards.map((r,i)=>`<span class="${i>=start&&i<=e.toyCursor?'active':''}"><small>${i+1}</small>${r}</span>`).join('')}</div><div class="a3-status">(${active.join(' + ')}) ÷ ${active.length} = ${f(mean,4)}</div>`;}
  function evidenceScene(){
    const e=S.evidence,curve=D.curves.find(c=>c.id===e.run)||D.curves[0],points=curve.points,index=Math.min(e.cursor,points.length-1),point=points[index];
    const min=Math.min(...points.map(p=>p.mean)),max=Math.max(...points.map(p=>p.mean)),range=Math.max(1,max-min),xy=p=>[45+(p.episode-points[0].episode)/Math.max(1,points.at(-1).episode-points[0].episode)*610,220-(p.mean-min)/range*180];
    const path=ps=>ps.map((p,i)=>(i?'L':'M')+xy(p).map(x=>f(x,2)).join(',')).join(' '),[cx,cy]=xy(point);
    return `<span class="a3-badge">${T('真实CSV记录；不是浏览器训练','Real CSV records; not browser training')}</span><svg class="a3-curve" viewBox="0 0 700 270" data-a3-chart role="img" aria-label="训练奖励50幕移动平均"><path class="a3-chart-axis" d="M45 20V220H655"/><text x="7" y="30">${f(max,1)}</text><text x="7" y="222">${f(min,1)}</text><path class="a3-curve-ghost" d="${path(points)}"/><path class="a3-curve-reveal" d="${path(points.slice(0,index+1))}"/><path class="a3-chart-cursor" d="M${cx} 20V220"/><circle cx="${cx}" cy="${cy}" r="5"/><text x="45" y="248">episode ${points[0].episode}</text><text x="540" y="248">${points.at(-1).episode}</text></svg><div class="a3-metrics">${metric('第几幕',point.episode)}${metric('这一幕原始reward',f(point.reward,3))}${metric('最近50幕平均',f(point.mean,3))}${metric('累计训练步数',point.steps)}</div><p>${T('曲线为显示速度抽取最多180个真实记录点；每点的50幕平均来自完整原始数据，不是对这180点重新取平均。拖滑块或点击曲线选择时刻。','Up to 180 recorded points are displayed. Each moving average was computed from the full original history, not from the displayed subsample.')}</p><a href="${asset(curve.csv)}" download>${T('下载这条曲线的完整CSV','Download the full CSV')}</a><p>${T('这张图记录训练中含探索的回报。它不等于另外运行的贪心评估平均回报。请根据自己的实验独立写报告解读。','These are training rewards including exploration, not separate greedy-evaluation means. Write your report interpretations independently.')}</p>`;
  }
  function explainScene(){
    const c=COMMITS[S.explain.card],questions=[
      ['为什么坐标一样，还要记录水晶？','因为后续是否可以结束任务，取决于已经拿到哪些水晶。代码用完整GameState作字典键。'],
      ['Q值都是负数时，为什么仍使用max？','Q是回报估计；-2大于-6。动作成本通过负奖励表示，比较的仍是更大的回报。'],
      ['终止时为什么不加gamma乘后继Q？','环境这一幕结束，后继没有继续交互产生的未来部分；进入终止状态的即时reward仍然要用。'],
      ['为什么有两个select_action方法？','一个读取QL表，另一个计算FQ点积；这两个公开方法都用于贪心评估，不执行训练更新。'],
      ['这份epsilon是每一步重新算吗？','这份参考代码在每次train_episode进入for循环之前计算一次，因此同一幕内保持不变，下一幕再按总步数更新。'],
      ['归一化后bias还一定是1吗？','不一定。整个原始向量包括bias一起除以范数。请在特征页点第0项查看实际数值。'],
      ['评估时任何变量都不能变化吗？','需要保持的是已学习的Q值、权重和训练计数。纯特征缓存可能新增条目，但这不等于更新已学权重。'],
      ['为什么预算异常不在solver里catch？','官方harness负责用它结束训练。把它吞掉会破坏预算与评分流程。'],
      ['每幕结束就把Q表清空吗？','不清空。initialise创建表；train_episode只重新取得初始状态，学习记录跨幕保留。']
    ];
    return `<section class="a3-milestone-focus"><span class="eyebrow">COMMIT ${S.explain.card+1} / 9</span><h3>${esc(c[0])}</h3><p>${esc(c[2])}</p><div class="a3-accept"><strong>${T('做到这些再提交','Verify before committing')}</strong><p>${esc(c[3])}</p></div><pre><code>${esc(c[1])}</code></pre><p>${T('在study/assignments/a3目录，先用下面的命令熟悉检查工具。默认检查的是参考实现；验证你自己的代码时，必须用--solver-dir指向你实际编写的目录。','The default command checks the reference implementation. Use --solver-dir to check the directory containing your own implementation.')}</p><pre><code>python practice_checks.py --stage ${S.explain.card+1}\npython practice_checks.py --stage ${S.explain.card+1} --solver-dir "你的代码目录"</code></pre><label><input type="checkbox" data-a3-commit-check="${S.explain.card+1}" ${progress.commits.includes(S.explain.card+1)?'checked':''}> ${T('我已在自己的版本完成并验证这一阶段','I implemented and verified this in my own version')}</label></section><div class="a3-commit-grid">${COMMITS.map((row,i)=>`<button type="button" data-a3-commit="${i}" class="${i===S.explain.card?'selected':''}"><span>${progress.commits.includes(i+1)?'✓':i+1}</span>${esc(row[0])}</button>`).join('')}</div><h3>${T('先自己说，再展开核对代码事实','Explain first, then check the code facts')}</h3><div class="a3-oral-cards">${questions.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div><p class="a3-small">${T('这些是代码机制练习，不是让你背诵的作者陈述。请只讲自己真正实现、检查过的版本；报告禁止AI的小问仍由你独立完成。','These are code-mechanism exercises, not an authorship script. Explain the version you actually implemented and verified. Restricted report answers remain independent.')}</p>`;
  }
  function renderScene(){return ({intro:worldScene,table:tableScene,update:updateScene,episode:episodeScene,features:featuresScene,weights:weightsScene,evidence:evidenceScene,explain:explainScene})[lesson]();}

  function worldMove(direction){
    const w=S.world;if(C.terminal(C.TOY,w.state))return;
    w.history.push({state:{...w.state,crystals:[...w.state.crystals]},reward:w.reward,last:w.last});
    const action=(C.tile(C.TOY,w.state.row,w.state.col)==='*'?'j':'w')+direction;
    const result=C.toyStep(w.state,direction,w.slip,diceRandom());
    w.state=result.state;w.reward+=result.reward;w.last={action,reward:result.reward,result};refresh();
  }
  function reset(){
    stop();
    if(lesson==='intro'){S.world={state:C.initial(C.TOY),history:[],reward:0,slip:S.world.slip,last:null};robotPrevious=null;}
    if(lesson==='table'){S.table.values=[[-6,-2,-4,-3],[-4,-1,-5,-2],[-3,-2,-1,-4]];S.table.guess=null;drawControls();}
    if(lesson==='update'){S.update.stage=0;S.update.feedback='';}
    if(lesson==='episode'){S.episode.index=0;S.episode.phase=0;drawControls();}
    if(lesson==='weights'){S.weights.weights=(S.weights.mode==='simple'?[1,.5,-.25]:featureData().normalised).map(()=>0);S.weights.stage=0;}
    if(lesson==='evidence'){S.evidence.cursor=0;drawControls();}
    if(lesson==='features')S.features.coordinate=0;
    refresh();
  }
  function next(){
    if(lesson==='update')S.update.stage=Math.min(5,S.update.stage+1);
    if(lesson==='episode'){
      if(S.episode.phase<5)S.episode.phase++;else if(S.episode.index<D.trace.length-1){S.episode.index++;S.episode.phase=0;syncRange('trace-index',S.episode.index,S.episode.index+1+' / '+D.trace.length);}
    }
    if(lesson==='features')S.features.coordinate=(S.features.coordinate+1)%21;
    if(lesson==='weights')S.weights.stage=Math.min(3,S.weights.stage+1);
    if(lesson==='evidence'){const curve=D.curves.find(c=>c.id===S.evidence.run)||D.curves[0];S.evidence.cursor=Math.min(curve.points.length-1,S.evidence.cursor+1);syncRange('curve-cursor',S.evidence.cursor);}
    refresh();
  }
  function back(){
    stop();
    if(lesson==='update')S.update.stage=Math.max(0,S.update.stage-1);
    if(lesson==='episode'){if(S.episode.phase>0)S.episode.phase--;else if(S.episode.index>0){S.episode.index--;S.episode.phase=5;}syncRange('trace-index',S.episode.index);}
    if(lesson==='weights')S.weights.stage=Math.max(0,S.weights.stage-1);
    refresh();
  }
  function finished(){return lesson==='update'?S.update.stage>=5:lesson==='episode'?S.episode.index===D.trace.length-1&&S.episode.phase===5:lesson==='features'?S.features.coordinate===20:lesson==='weights'?S.weights.stage>=3:lesson==='evidence'?S.evidence.cursor>=(D.curves.find(c=>c.id===S.evidence.run)||D.curves[0]).points.length-1:true;}
  function syncRange(name,value,label){const input=host?.querySelector(`[data-a3-field="${name}"]`);if(input)input.value=value;const output=host?.querySelector('#a3-out-'+name);if(output)output.textContent=label??(name==='trace-index'?(value+1)+' / '+D.trace.length:name==='curve-cursor'?(value+1)+' / '+(D.curves.find(c=>c.id===S.evidence.run)||D.curves[0]).points.length:String(value));}
  function drawDice(times=1){
    const e=S.episode;
    for(let i=0;i<times;i++){const roll=diceRandom(),choice=diceRandom(),result=C.choose([-6,-2,-4,-3],e.epsilon,roll,choice,e.mode);e.roll=result;e.draws++;e.histogram[result.index]++;if(result.explored)e.explorations++;}
    const target=host.querySelector('#a3-dice-result');if(target)target.innerHTML=diceScene();
  }
  function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function onClick(event){
    const direction=event.target.closest('[data-a3-direction]');if(direction){stop();worldMove(direction.dataset.a3Direction);return;}
    const guess=event.target.closest('[data-a3-guess]');if(guess){S.table.guess=+guess.dataset.a3Guess;refresh();return;}
    const feature=event.target.closest('[data-a3-feature]');if(feature){stop();S.features.coordinate=+feature.dataset.a3Feature;refresh();return;}
    const cell=event.target.closest('[data-a3-cell]');if(cell){
      stop();const [r,c]=cell.dataset.a3Cell.split(',').map(Number),state=featureState(),map=mapById();state.row=r;state.col=c;
      map.crystals.forEach((p,i)=>{if(p[0]===r&&p[1]===c)state.crystals[i]=1;});
      const actions=C.validActions(map,state);if(!actions.includes(S.features.action))S.features.action=actions[0];
      drawControls();refresh();host.querySelector(`[data-a3-cell="${r},${c}"]`)?.focus({preventScroll:true});return;
    }
    const milestone=event.target.closest('[data-a3-commit]');if(milestone){S.explain.card=+milestone.dataset.a3Commit;drawControls();refresh();return;}
    const chart=event.target.closest('[data-a3-chart]');if(chart){const curve=D.curves.find(c=>c.id===S.evidence.run)||D.curves[0],rect=chart.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,((event.clientX-rect.left)/rect.width*700-45)/610)),episode=curve.points[0].episode+fraction*(curve.points.at(-1).episode-curve.points[0].episode);S.evidence.cursor=curve.points.reduce((best,p,i)=>Math.abs(p.episode-episode)<Math.abs(curve.points[best].episode-episode)?i:best,0);syncRange('curve-cursor',S.evidence.cursor);refresh();return;}
    const control=event.target.closest('[data-a3-action]');if(!control)return;
    const action=control.dataset.a3Action;
    if(action==='next'){stop();next();}
    else if(action==='back')back();
    else if(action==='reset'||action==='world-reset'||action==='table-reset')reset();
    else if(action==='play'){if(!timer&&finished())reset();play(next,finished);}
    else if(action==='world-demo'){
      if(timer){stop();return;}reset();S.world.slip=false;drawControls();
      let steps=0;play(()=>{worldMove('r');steps++;},()=>steps>=6||C.terminal(C.TOY,S.world.state));
    }
    else if(action==='prediction'){
      const u=S.update,answer=C.qUpdate(u.old,u.reward,u.gamma,u.alpha,u.nextMax,u.terminal).value;
      u.feedback=u.prediction.trim()===''?'先输入你手算的数值。':Math.abs(Number(u.prediction)-answer)<=.001?`数值一致：${f(answer,6)}。现在逐步看它是怎样算出来的。`:`你填了${u.prediction}。逐步核对target、差距与改变量；最后应得到${f(answer,6)}。`;
      refresh();
    }
    else if(action==='roll')drawDice(1);
    else if(action==='roll100')drawDice(100);
    else if(action==='roll-reset'){S.episode.histogram=[0,0,0,0];S.episode.draws=0;S.episode.explorations=0;S.episode.roll=null;drawDice(0);}
    else if(action==='weights-apply'){if(S.weights.stage>=3){S.weights.weights=weightsData().nextWeights;S.weights.stage=0;refresh();}}
    else if(action==='curve-all'){stop();S.evidence.cursor=(D.curves.find(c=>c.id===S.evidence.run)||D.curves[0]).points.length-1;syncRange('curve-cursor',S.evidence.cursor);refresh();}
    else if(action==='present'){S.explain.present=!S.explain.present;chrome();}
    else if(action==='complete'){progress.done=progress.done.includes(lesson)?progress.done.filter(x=>x!==lesson):[...progress.done,lesson];save();chrome();}
    else if(action==='backup')download('COMP3702-A3-unit-progress.json',JSON.stringify(clean(progress),null,2),'application/json');
    else if(action==='notes'){
      let text='# A3 我的讲解笔记\n\n';for(const [id,zh,en]of LESSONS)text+=`## ${zh} / ${en}\n\n${progress.notes[id]||'尚未填写'}\n\n`;
      text+='## 九个开发里程碑\n\n'+COMMITS.map((c,i)=>`${i+1}. ${progress.commits.includes(i+1)?'[x]':'[ ]'} ${c[0]}\n   ${c[1]}`).join('\n');download('A3-我的讲解笔记.md',text,'text/markdown;charset=utf-8');
    }
  }
  function onInput(event){
    const el=event.target;if(el.matches('[data-a3-note]')){progress.notes[lesson]=el.value.slice(0,10000);save();return;}
    const name=el.dataset.a3Field;if(!name||el.type==='checkbox'||el.tagName==='SELECT')return;
    if(name==='prediction'){S.update.prediction=el.value;return;}
    const value=Number(el.value);if(!Number.isFinite(value)||el.value.trim()==='')return;
    const limited=Math.max(el.min===''?-1000:Number(el.min),Math.min(el.max===''?1000:Number(el.max),value));
    const output=host.querySelector('#a3-out-'+name);if(output)output.textContent=f(limited);
    if(name.startsWith('table-')){S.table.values[S.table.state][+name.slice(6)]=limited;S.table.guess=null;}
    if(name.startsWith('u-')){S.update[{old:'old',reward:'reward',next:'nextMax',alpha:'alpha',gamma:'gamma'}[name.slice(2)]]=limited;S.update.stage=0;S.update.feedback='';stop();}
    if(name==='trace-index'){stop();S.episode.index=Math.max(0,Math.min(D.trace.length-1,Math.round(limited)));S.episode.phase=0;}
    if(name==='epsilon'){S.episode.epsilon=limited;drawDice(0);return;}
    if(name.startsWith('w-')){S.weights[{reward:'reward',next:'nextMax',alpha:'alpha',gamma:'gamma'}[name.slice(2)]]=limited;S.weights.stage=0;stop();}
    if(name==='curve-cursor'){stop();S.evidence.cursor=Math.round(limited);}
    if(name==='ma-window'){S.evidence.window=Math.round(limited);host.querySelector('#a3-ma-demo').innerHTML=movingDemo();return;}
    if(name==='ma-cursor'){S.evidence.toyCursor=Math.round(limited)-1;host.querySelector('#a3-ma-demo').innerHTML=movingDemo();return;}
    refresh();
  }
  async function onChange(event){
    const el=event.target,name=el.dataset.a3Field;
    if(el.id==='a3-unit-import'){
      const file=el.files[0];if(!file)return;
      try{if(file.size>500000)throw Error('记录过大');const raw=JSON.parse(await file.text());if(raw.kind!=='comp3702-a3-unit'||raw.version!==1)throw Error('请选择本单元导出的记录');importProgress(raw);chrome();}
      catch(error){const note=document.createElement('p');note.className='a3-status';note.setAttribute('role','alert');note.textContent=error.message;host.querySelector('.a3-notes').appendChild(note);}return;
    }
    if(el.dataset.a3CommitCheck){const i=+el.dataset.a3CommitCheck;progress.commits=el.checked?[...new Set([...progress.commits,i])]:progress.commits.filter(x=>x!==i);save();refresh();return;}
    if(el.hasAttribute('data-a3-crystal')){featureState().crystals[+el.dataset.a3Crystal]=+el.checked;refresh();return;}
    if(!name)return;
    stop();
    if(name==='world-slip')S.world.slip=el.checked;
    else if(name==='table-state'){S.table.state=+el.value;S.table.guess=null;drawControls();}
    else if(name==='u-terminal'){S.update.terminal=el.checked;S.update.stage=0;S.update.feedback='';}
    else if(name==='decision-mode'){S.episode.mode=el.value;S.episode.histogram=[0,0,0,0];S.episode.draws=0;S.episode.explorations=0;S.episode.roll=null;drawDice(0);host.querySelector('#a3-source').innerHTML=sourcePane(...lessonCode());return;}
    else if(name==='feature-map'){S.features.map=el.value;S.features.state=null;S.features.action='wr';drawControls();}
    else if(name==='feature-action')S.features.action=el.value;
    else if(name==='feature-distances')S.features.distances=el.checked;
    else if(name==='weight-mode'){S.weights.mode=el.value;S.weights.weights=[];S.weights.stage=0;}
    else if(name==='w-terminal'){S.weights.terminal=el.checked;S.weights.stage=0;}
    else if(name==='curve-run'){S.evidence.run=el.value;S.evidence.cursor=0;drawControls();}
    else if(name==='commit-index')S.explain.card=+el.value;
    else return;
    refresh();
    if(el.tagName==='SELECT'&&!el.isConnected)host.querySelector(`[data-a3-field="${name}"]`)?.focus({preventScroll:true});
  }
  function onKey(event){
    if(lesson!=='intro'||event.target.closest('input,textarea,select,summary,[contenteditable="true"]'))return;
    const direction={ArrowUp:'u',ArrowRight:'r',ArrowDown:'d',ArrowLeft:'l'}[event.key];
    if(direction){event.preventDefault();stop();worldMove(direction);}
  }

  function refresh(){
    const scene=host?.querySelector('#a3-scene');if(!scene)return;
    const focus=document.activeElement,focusBoard=focus?.classList?.contains('a3-board'),focusKey=['a3Feature','a3Cell','a3Guess'].find(key=>focus?.dataset?.[key]!==undefined),focusValue=focusKey?focus.dataset[focusKey]:null;
    scene.innerHTML=renderScene();
    host.querySelector('#a3-source').innerHTML=sourcePane(...lessonCode());
    const dice=host.querySelector('#a3-dice-result');if(dice)dice.innerHTML=diceScene();
    const average=host.querySelector('#a3-ma-demo');if(average)average.innerHTML=movingDemo();
    if(lesson==='episode')syncRange('trace-index',S.episode.index);
    if(lesson==='evidence')syncRange('curve-cursor',S.evidence.cursor);
    const apply=host.querySelector('[data-a3-action="weights-apply"]');if(apply)apply.disabled=S.weights.stage<3;
    if(lesson==='intro')host.querySelectorAll('[data-a3-direction]').forEach(b=>b.disabled=C.terminal(C.TOY,S.world.state));
    animateRobot();syncPlay();
    if(focusKey){const attribute={a3Feature:'data-a3-feature',a3Cell:'data-a3-cell',a3Guess:'data-a3-guess'}[focusKey];host.querySelector(`[${attribute}="${focusValue}"]`)?.focus({preventScroll:true});}
    else if(focusBoard)host.querySelector('.a3-board')?.focus({preventScroll:true});
  }
  function dispose(){stop();if(roverFrame)cancelAnimationFrame(roverFrame);roverFrame=0;if(host){host.removeEventListener('click',clickListener);host.removeEventListener('input',inputListener);host.removeEventListener('change',changeListener);host.removeEventListener('keydown',keyListener);}host=null;document.body.classList.remove('a3-unit-active');}
  function mount(root,id='intro'){
    dispose();host=root;lesson=IDS.includes(id)?id:'intro';document.body.classList.add('a3-unit-active');
    clickListener=onClick;inputListener=onInput;changeListener=onChange;keyListener=onKey;
    host.addEventListener('click',clickListener);host.addEventListener('input',inputListener);host.addEventListener('change',changeListener);host.addEventListener('keydown',keyListener);chrome();
  }
  function applyUnitLanguage(){if(!standalone())return;document.body.dataset.reading=progress.language;document.documentElement.lang=progress.language==='en'?'en':'zh-CN';const select=document.getElementById('a3-reading-mode');if(select)select.value=progress.language;}
  function importProgress(raw){if(raw?.kind!=='comp3702-a3-unit'||raw.version!==1)throw Error('请选择本单元导出的记录');progress=clean(raw);save();applyUnitLanguage();return clean(progress);}
  window.A3Unit={mount,dispose,exportProgress:()=>clean(progress),importProgress,lessons:LESSONS,commits:COMMITS};
  const preferenceChanged=()=>{stop();if(host)refresh();};
  if(reduced?.addEventListener)reduced.addEventListener('change',preferenceChanged);
  else reduced?.addListener?.(preferenceChanged);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  if(standalone()){
    const root=document.getElementById('a3-root');
    const select=document.getElementById('a3-reading-mode');
    select.addEventListener('change',()=>{progress.language=select.value;save();applyUnitLanguage();});applyUnitLanguage();
    const routeStandalone=()=>{mount(root,location.hash.slice(1)||'intro');window.scrollTo(0,0);window.StudyTransitions?.afterRoute();};
    window.addEventListener('hashchange',routeStandalone);routeStandalone();
  }
})();
