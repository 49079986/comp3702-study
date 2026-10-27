const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require('path'),root=path.resolve(__dirname,'..','docs');
const ctx={window:{},console,setInterval,clearInterval};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'labs.js'),'utf8'),ctx);
const A=ctx.window.StudyAlgorithms;
let results=[];
for(const [alg,cost,pathExpected]of[['BFS',11,'SAG'],['DFS',7,'SACG'],['UCS',6,'SBCG'],['GBFS',8,'SBDG'],['A*',6,'SBCG']]){
 const end=A.traceSearch(alg).at(-1);assert.equal(end.node.g,cost);assert.equal(end.node.path.join(''),pathExpected);assert(end.done);results.push(`${alg}: ${cost}`);
}
const ac=A.ac3Trace().at(-1);assert.deepEqual(JSON.parse(JSON.stringify(ac.d)),{A:[1],B:[2],C:[3]});
for(const p of[.4,.8,1])for(let s=0;s<13;s++)if(s!==5)for(let a=0;a<4;a++){
 const t=A.gridTransitions(s,a,p);assert(Math.abs(t.reduce((n,x)=>n+x.p,0)-1)<1e-12);assert(t.every(x=>x.p>=0&&x.s!==5));
}
let t=A.gridTransitions(0,0,.8);assert(Math.abs(t.find(x=>x.s===0).p-.9)<1e-12);assert(Math.abs(t.find(x=>x.s===1).p-.1)<1e-12);
let v=Array(13).fill(0);let first=A.viStep(v);assert.equal(first.v[3],1);assert.equal(first.v[7],-1);assert.equal(first.v[0],0);assert.equal(first.v[12],0);
for(let i=0;i<500;i++)v=A.viStep(v).v;assert(A.viStep(v).delta<1e-10);assert.equal(v[3],1);assert.equal(v[7],-1);assert.equal(v[12],0);assert(v[0]>0&&v[0]<1);
const q=A.qUpdates(3,2,.9,.5,8,1);assert(Math.abs(q.ql-6.1)<1e-10);assert(Math.abs(q.sarsa-2.95)<1e-10);assert.equal(A.qUpdates(3,2,.9,.5,8,1,true).ql,2.5);
const alpha=A.alphaTrace().at(-1);assert.equal(alpha.values.R,4);assert.equal(alpha.visited.length,7);assert.deepEqual([...alpha.pruned],['B1','B2']);
vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);let d=ctx.window.STUDY_DATA;
assert.equal(d.chapters.length,15);assert.equal(d.quiz.length,75);assert.equal(d.problems.length,24);assert.equal(new Set(d.quiz.map(q=>q.id)).size,75);
for(const q of d.quiz){assert.equal(q.options.length,4);assert(q.answer>=0&&q.answer<4);assert.equal(new Set(q.options).size,4);assert(d.chapters.some(c=>c.id===q.chapter));}
for(const p of d.problems)assert.equal(p.rubric.reduce((n,r)=>n+r[0],0),10);
for(const m of d.mocks){assert.equal(m.items.reduce((n,p)=>n+p.marks,0),100);for(const p of m.items)assert.equal(p.rubric.reduce((n,r)=>n+r[0],0),p.marks);}
console.log(JSON.stringify({algorithms:results,ac3:ac.d,gridworld:'transition probabilities and converged Bellman residual verified',qLearning:q,alphaBeta:{root:4,visited:7,pruned:2},content:{chapters:d.chapters.length,quiz:d.quiz.length,written:d.problems.length,mocks:d.mocks.length}},null,2));
