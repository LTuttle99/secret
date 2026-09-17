(function(){
  "use strict";
  const studio=window.DataHubStudio;
  if(!studio) return;
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const modeRank={guided:0,standard:1,expert:2};
  const viewLabels={overview:"Overview",data:"Data catalog",workflow:"Workflow",dictionary:"Dictionary",quality:"Data quality",intelligence:"Intelligence",analyst:"Analyst Lab",dashboard:"Dashboard Studio",operations:"Operations",report:"Report Studio",automate:"Automation",builder:"Tool Builder"};
  let selected=0, filtered=[], saveTimer=null, gPending=false;

  function setMode(mode,announce=true){
    mode=modeRank[mode]===undefined?"guided":mode;
    localStorage.setItem("datahub_workspace_mode",mode);
    $("#workspace-mode").value=mode;
    $$("[data-mode-min]").forEach(node=>node.hidden=modeRank[node.dataset.modeMin]>modeRank[mode]);
    const active=$(".nav-item.active");
    if(active?.hidden) studio.showView("overview");
    document.body.dataset.workspaceMode=mode;
    if(announce) studio.toast(mode==="guided"?"Guided workspace: essentials only":mode==="standard"?"Standard workspace enabled":"All Studio tools are visible");
  }

  const commands=[
    ...Object.entries(viewLabels).map(([view,label])=>({label,detail:"Open workspace",icon:"↗",group:"View",terms:view,run:()=>studio.showView(view)})),
    {label:"Open project chat",detail:"Talk with your team",icon:"◎",group:"Collaborate",terms:"message team room",run:()=>$("#open-chat-btn")?.click()},
    {label:"Load sample project",detail:"Explore Studio with example data",icon:"▦",group:"Action",terms:"demo example",run:()=>{studio.showView("data");setTimeout(()=>$("#sample-project-btn")?.click(),150)}},
    {label:"Save project",detail:"Save changes in this browser",icon:"✓",group:"Action",terms:"store",shortcut:"⌘S",run:()=>studio.saveProject()},
    {label:"Show guided tour",detail:"Open the four-step getting-started guide",icon:"?",group:"Help",terms:"onboarding learn",run:()=>openOnboarding()},
    {label:"Guided workspace",detail:"Show the essential path",icon:"1",group:"Mode",terms:"simple beginner",run:()=>setMode("guided")},
    {label:"Standard workspace",detail:"Add workflow, quality, intelligence, and operations",icon:"2",group:"Mode",terms:"medium",run:()=>setMode("standard")},
    {label:"All tools",detail:"Show every specialist tool",icon:"3",group:"Mode",terms:"expert advanced",run:()=>setMode("expert")},
    {label:"Analyst · Prepare data",detail:"Review safe cleaning suggestions",icon:"V",group:"Tool",terms:"clean",run:()=>openTab("analyst","prepare")},
    {label:"Analyst · Explore patterns",detail:"Build charts and geographic views",icon:"V",group:"Tool",terms:"chart geography",run:()=>openTab("analyst","explore")},
    {label:"Analyst · Model outcomes",detail:"Forecast and test evidence",icon:"V",group:"Tool",terms:"statistics scenario",run:()=>openTab("analyst","model")},
    {label:"Operations · Action items",detail:"Manage tasks, issues, and decisions",icon:"◎",group:"Tool",terms:"task work",run:()=>openTab("operations","work")},
    {label:"Operations · Data requests",detail:"Collect well-framed requests and responses",icon:"◎",group:"Tool",terms:"intake form",run:()=>openTab("operations","intake")},
    {label:"Operations · Governance",detail:"Review lineage, metrics, and knowledge",icon:"◎",group:"Tool",terms:"lineage knowledge",run:()=>openTab("operations","govern")}
  ];

  function openTab(view,tab){
    setMode("expert",false); studio.showView(view);
    setTimeout(()=>document.querySelector('[data-'+(view==="analyst"?"analyst":"ops")+'-tab="'+tab+'"]')?.click(),80);
  }
  function openPalette(query=""){
    $("#command-palette").hidden=false; $("#command-input").value=query; selected=0; renderCommands(); requestAnimationFrame(()=>$("#command-input").focus());
  }
  function closePalette(){ $("#command-palette").hidden=true; }
  function renderCommands(){
    const q=$("#command-input").value.trim().toLowerCase();
    filtered=commands.filter(c=>(c.label+" "+c.detail+" "+c.group+" "+(c.terms||"")).toLowerCase().includes(q)).slice(0,12);
    selected=Math.min(selected,Math.max(filtered.length-1,0));
    $("#command-results").innerHTML=filtered.length?filtered.map((c,i)=>'<button class="command-result '+(i===selected?"selected":"")+'" role="option" aria-selected="'+(i===selected)+'" data-command-index="'+i+'"><span class="command-icon">'+c.icon+'</span><span><strong>'+c.label+'</strong><small>'+c.detail+'</small></span><em>'+(c.shortcut||c.group)+'</em></button>').join(""):'<div class="command-empty">No matching tool or action</div>';
  }
  function runCommand(i){ const c=filtered[i]; if(!c)return; closePalette(); c.run(); }

  function projectProgress(){
    const p=studio.state.project||{}, ds=p.datasets||[];
    if(!ds.length) return {n:1,title:"Add your first data source",text:"Upload a file, connect a public source, or load the sample project.",view:"data",button:"Add data"};
    if(!(p.steps||[]).length) return {n:2,title:"Choose the question and plan",text:"Tell Vanessa the decision you need to make and build a clear analysis plan.",view:"analyst",button:"Plan analysis"};
    if(!(p.report||p.stories?.length)) return {n:3,title:"Turn evidence into a story",text:"Explore the data, check quality, then generate a decision-ready report.",view:"report",button:"Build report"};
    return {n:4,title:"Share the result and assign the next move",text:"Open Operations to capture decisions, owners, and the work that follows.",view:"operations",button:"Open operations"};
  }
  function renderNextStep(){
    const node=$("#next-step-card"); if(!node)return;
    const s=projectProgress();
    node.innerHTML='<div class="next-step-index">'+s.n+'</div><div><strong>'+s.title+'</strong><span>'+s.text+'</span></div><button class="button primary" data-next-view="'+s.view+'">'+s.button+'</button>';
  }
  function onboardingSteps(){
    const p=studio.state.project||{};
    return [
      {label:"Add a data source",detail:"Files, folders, URLs, or sample data",view:"data",done:(p.datasets||[]).length>0},
      {label:"Frame the decision",detail:"Use Analyst Lab to build a plan",view:"analyst",done:(p.analystPlans||[]).length>0||(p.steps||[]).length>0},
      {label:"Create the story",detail:"Generate a report from the evidence",view:"report",done:!!p.report||(p.stories||[]).length>0},
      {label:"Assign the follow-through",detail:"Tasks, decisions, and ownership",view:"operations",done:(p.tasks||[]).length>0||(p.decisions||[]).length>0}
    ];
  }
  function renderOnboarding(){
    $("#onboarding-steps").innerHTML=onboardingSteps().map((s,i)=>'<button class="onboarding-step '+(s.done?"done":"")+'" data-onboard-view="'+s.view+'"><i>'+(s.done?"✓":i+1)+'</i><strong>'+s.label+'</strong><span>'+s.detail+'</span></button>').join("");
  }
  function openOnboarding(){ renderOnboarding(); $("#onboarding-scrim").hidden=false; $("#onboarding-panel").classList.add("open"); $("#onboarding-panel").setAttribute("aria-hidden","false"); }
  function closeOnboarding(remember=true){ $("#onboarding-panel").classList.remove("open"); $("#onboarding-panel").setAttribute("aria-hidden","true"); $("#onboarding-scrim").hidden=true; if(remember)localStorage.setItem("datahub_onboarding_seen","1"); }

  let revealObserver;
  function observeReveal(){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    revealObserver ||= new IntersectionObserver(entries=>entries.forEach(entry=>{
      entry.target.classList.toggle("in-view",entry.isIntersecting);
      entry.target.classList.toggle("above-view",!entry.isIntersecting&&entry.boundingClientRect.bottom<100);
    }),{rootMargin:"-4% 0px -12%",threshold:.08});
    $$(".studio-view.active .surface,.studio-view.active .metric-card,.studio-view.active .next-step-card,.studio-view.active .source-guide-card,.studio-view.active .drop-zone").forEach(node=>{
      if(!node.classList.contains("reveal-item")){node.classList.add("reveal-item");revealObserver.observe(node);}
    });
  }

  function updateSaveState(){
    const node=$("#save-status"); if(!node)return;
    if(studio.state.dirty){node.textContent="Unsaved";node.className="save-status saving";clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{if(studio.state.dirty){node.textContent="Saving…";await studio.saveProject(true);node.textContent="Saved";node.className="save-status saved";}},1800);}
    else {node.textContent="Saved";node.className="save-status saved";}
  }

  $("#workspace-mode").addEventListener("change",e=>setMode(e.target.value));
  $("#open-command-btn").addEventListener("click",()=>openPalette());
  $("#command-input").addEventListener("input",()=>{selected=0;renderCommands();});
  $("#command-results").addEventListener("click",e=>{const b=e.target.closest("[data-command-index]");if(b)runCommand(+b.dataset.commandIndex);});
  $("#command-palette").addEventListener("click",e=>{if(e.target===$("#command-palette"))closePalette();});
  $("#next-step-card").addEventListener("click",e=>{const b=e.target.closest("[data-next-view]");if(b){if(b.dataset.nextView==="operations")setMode("standard",false);studio.showView(b.dataset.nextView);}});
  $("#close-onboarding-btn").addEventListener("click",()=>closeOnboarding());
  $("#finish-onboarding-btn").addEventListener("click",()=>closeOnboarding());
  $("#onboarding-scrim").addEventListener("click",()=>closeOnboarding());
  $("#onboarding-steps").addEventListener("click",e=>{const b=e.target.closest("[data-onboard-view]");if(b){if(b.dataset.onboardView==="operations")setMode("standard",false);studio.showView(b.dataset.onboardView);closeOnboarding();}});

  document.addEventListener("keydown",e=>{
    const typing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openPalette();return;}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="s"){e.preventDefault();studio.saveProject();return;}
    if(!$("#command-palette").hidden){
      if(e.key==="Escape"){e.preventDefault();closePalette();}
      if(e.key==="ArrowDown"){e.preventDefault();selected=Math.min(selected+1,filtered.length-1);renderCommands();}
      if(e.key==="ArrowUp"){e.preventDefault();selected=Math.max(selected-1,0);renderCommands();}
      if(e.key==="Enter"){e.preventDefault();runCommand(selected);}
      return;
    }
    if(!typing&&e.key==="?"){e.preventDefault();openPalette("help");}
    if(!typing&&e.key.toLowerCase()==="g"){gPending=true;setTimeout(()=>gPending=false,900);return;}
    if(!typing&&gPending){const map={o:"overview",d:"data",a:"analyst",i:"intelligence",p:"operations",r:"report"};const view=map[e.key.toLowerCase()];if(view){e.preventDefault();setMode("expert",false);studio.showView(view);}gPending=false;}
  });

  window.addEventListener("datahub:project-render",()=>{renderNextStep();renderOnboarding();updateSaveState();setTimeout(observeReveal,50);});
  new MutationObserver(()=>{updateSaveState();setTimeout(observeReveal,30);}).observe($("#save-project-btn"),{childList:true,subtree:true});
  new MutationObserver(()=>setTimeout(observeReveal,40)).observe($(".studio-main"),{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});

  setMode(localStorage.getItem("datahub_workspace_mode")||"guided",false);
  renderNextStep(); updateSaveState(); observeReveal();
  if(!localStorage.getItem("datahub_onboarding_seen")) setTimeout(openOnboarding,650);
})();
