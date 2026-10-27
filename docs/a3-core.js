/* Pure arithmetic and classroom models for the A3 learning unit. No DOM or storage. */
'use strict';
(() => {
  const ACTIONS=['wl','wr','wu','wd','bl','br','bu','bd','jl','jr','ju','jd'];
  const DIR={l:[0,-1],r:[0,1],u:[-1,0],d:[1,0]};
  const FEATURE_NAMES=['bias','walk','boost','jump','left','right','up','down','target_distance','target_distance_ahead_1','target_progress_ahead_1','target_progress_ahead_2','target_progress_ahead_4','lava_forward','lava_side','rock_forward','crater_forward','crystals_remaining_fraction','ready_for_launch','uncollected_crystal_ahead','launch_ahead'];
  const dot=(a,b)=>a.reduce((total,x,i)=>total+x*b[i],0);
  const key=(r,c)=>r+','+c;
  const tile=(map,r,c)=>r<0||c<0||r>=map.rows||c>=map.cols?'R':map.grid[r][c];
  const validActions=(map,state)=>tile(map,state.row,state.col)==='*'?ACTIONS.slice(8):ACTIONS.slice(0,8);
  const terminal=(map,state)=>tile(map,state.row,state.col)==='L'||(state.crystals.reduce((n,x)=>n+x,0)>=map.minSamples&&map.launches.some(p=>p[0]===state.row&&p[1]===state.col));
  function bfs(map,target){
    const distances=new Map([[key(...target),0]]),queue=[target];
    for(let head=0;head<queue.length;head++){
      const [r,c]=queue[head],distance=distances.get(key(r,c));
      for(const [dr,dc]of Object.values(DIR)){
        const next=[r+dr,c+dc],id=key(...next);
        if(!distances.has(id)&&!['R','L'].includes(tile(map,...next))){distances.set(id,distance+1);queue.push(next);}
      }
    }
    return distances;
  }
  function featureModel(map){
    const scale=Math.max(1,map.rows+map.cols),allTargets=[...map.crystals,...map.launches];
    const distances=new Map(allTargets.map(p=>[key(...p),bfs(map,p)]));
    function features(state,action){
      const ready=state.crystals.reduce((n,x)=>n+x,0)>=map.minSamples;
      const targets=ready?map.launches:map.crystals.filter((_,i)=>!state.crystals[i]);
      const distanceAt=pos=>Math.min(...targets.map(p=>distances.get(key(...p)).get(key(...pos))??scale));
      const [dr,dc]=DIR[action[1]],current=distanceAt([state.row,state.col]);
      const ray=length=>{
        let r=state.row,c=state.col;
        for(let i=0;i<length;i++){
          if(['R','L'].includes(tile(map,r+dr,c+dc)))break;
          r+=dr;c+=dc;if(tile(map,r,c)==='*')break;
        }
        return [r,c];
      };
      const ahead=[1,2,4].map(ray),future=ahead.map(distanceAt),progress=future.map(d=>(current-d)/scale);
      const forward=tile(map,state.row+dr,state.col+dc),side1=tile(map,state.row-dc,state.col+dr),side2=tile(map,state.row+dc,state.col-dr);
      const boost=action[0]==='b';
      const raw=[1,+(action[0]==='w'),+boost,+(action[0]==='j'),+(action[1]==='l'),+(action[1]==='r'),+(action[1]==='u'),+(action[1]==='d'),
        Math.min(current/scale,1),Math.min(future[0]/scale,1),progress[0],boost?progress[1]:0,boost?progress[2]:0,
        +(forward==='L'),.5*(+(side1==='L')+ +(side2==='L')),+(forward==='R'),+(forward==='*'),
        Math.max(0,map.minSamples-state.crystals.reduce((n,x)=>n+x,0))/Math.max(1,map.minSamples),+ready,
        +map.crystals.some((p,i)=>!state.crystals[i]&&key(...p)===key(...ahead[0])),
        +(ready&&map.launches.some(p=>key(...p)===key(...ahead[0])))];
      const norm=Math.max(1,Math.sqrt(dot(raw,raw)));
      return {raw,normalised:raw.map(x=>x/norm),norm,current,ahead,future,targets,distanceAt,ready};
    }
    return {features,distances,scale};
  }
  function qUpdate(old,reward,gamma,alpha,nextMax,isTerminal=false){
    const continuation=isTerminal?0:gamma*nextMax,target=reward+continuation,error=target-old;
    return {old,reward,gamma,alpha,nextMax,isTerminal,continuation,target,error,change:alpha*error,value:old+alpha*error};
  }
  function weightUpdate(weights,features,reward,gamma,alpha,nextMax,isTerminal=false){
    const old=dot(weights,features),update=qUpdate(old,reward,gamma,alpha,nextMax,isTerminal);
    const changes=features.map(x=>alpha*update.error*x),nextWeights=weights.map((w,i)=>w+changes[i]);
    return {...update,weights:[...weights],features:[...features],changes,nextWeights,nextQ:dot(nextWeights,features)};
  }
  function epsilon(used,budget,start=.25,end=.02,fraction=.8){return start+Math.min(1,used/Math.max(1,budget*fraction))*(end-start);}
  function random(seed=3702){let x=seed>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
  function choose(values,eps,roll,choice=.5,mode='train'){
    const best=Math.max(...values),ties=values.map((v,i)=>v===best?i:-1).filter(i=>i>=0);
    if(mode==='evaluate')return {index:ties[0],branch:'greedy',roll,explored:false};
    const explored=roll<eps,pool=explored?values.map((_,i)=>i):ties;
    return {index:pool[Math.min(pool.length-1,Math.floor(choice*pool.length))],branch:explored?'explore':'greedy',roll,explored};
  }
  function movingAverage(values,window=50){
    let total=0;return values.map((value,i)=>{total+=value;if(i>=window)total-=values[i-window];return total/Math.min(i+1,window);});
  }
  const TOY={id:'classroom',rows:6,cols:9,minSamples:1,grid:['RRRRRRRRR','R   C  ER','R R R L R','R *     R','R   R C R','RRRRRRRRR'],init:[1,1],crystals:[[1,4],[4,6]],launches:[[1,7]]};
  const initial=map=>({row:map.init[0],col:map.init[1],crystals:map.crystals.map(()=>0)});
  function toyStep(state,direction,slip=false,roll=.5){
    if(terminal(TOY,state))return {state:{...state,crystals:[...state.crystals]},reward:0,done:true,actual:direction,blocked:false};
    const directions=['u','r','d','l'];let actual=direction;
    if(slip&&roll<.25){const i=directions.indexOf(direction);actual=directions[(i+(roll<.125?1:3))%4];}
    const [dr,dc]=DIR[actual],next={...state,crystals:[...state.crystals]},ahead=tile(TOY,state.row+dr,state.col+dc),blocked=ahead==='R';
    let reward=-1;if(blocked)reward=-1.5;else{next.row+=dr;next.col+=dc;}
    if(ahead==='L')reward=-10;
    TOY.crystals.forEach((p,i)=>{if(key(...p)===key(next.row,next.col))next.crystals[i]=1;});
    return {state:next,reward,done:terminal(TOY,next),actual,blocked};
  }
  const API={ACTIONS,DIR,FEATURE_NAMES,dot,tile,validActions,terminal,bfs,featureModel,qUpdate,weightUpdate,epsilon,random,choose,movingAverage,TOY,initial,toyStep};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(typeof window!=='undefined')window.A3Core=API;
})();
