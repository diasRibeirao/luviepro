function fulfillJson(route,status,body){
  return route.fulfill({
    status,
    contentType:'application/json',
    body:JSON.stringify(body),
  });
}

export const projectStatuses=[
  {key:'scheduled',name:'Agendados',color:'#C9A84C',active:true},
  {key:'in_progress',name:'Em andamento',color:'#245B43',active:true},
  {key:'completed',name:'Concluídos',color:'#6F8C78',active:true},
];

export const projectAlpha={
  id:'project-alpha',
  name:'Casamento Aurora',
  status:'in_progress',
  progress:40,
  startDate:'2026-08-20',
  client:{name:'Empresa Aurora'},
  quote:{number:'ORC-001',totalCents:120000,finalTotalCents:120000},
  tasks:[
    {id:'task-1',title:'Confirmar flores',status:'pending',priority:'high',dueDate:'2000-01-01'},
  ],
};

export const projectBeta={
  id:'project-beta',
  name:'Evento Horizonte',
  status:'scheduled',
  progress:0,
  startDate:null,
  client:{name:'Cliente Horizonte'},
  quote:{number:'ORC-002',totalCents:80000,finalTotalCents:80000},
  tasks:[],
};

function detailFrom(project){
  return {
    name:project.name,
    status:project.status,
    progress:project.progress,
    notes:'Planejamento inicial confirmado com o cliente.',
    startDate:project.startDate,
    endDate:'2026-09-15',
    client:{name:project.client?.name??'Cliente'},
    quote:project.quote,
    tasks:(project.tasks??[]).map(task=>({
      ...task,
      description:task.description??null,
    })),
    activityNotes:[
      {
        id:'activity-1',
        authorName:'Maria',
        createdAt:'2026-08-25T13:00:00.000Z',
        content:'Cliente confirmou o cronograma.',
      },
    ],
  };
}

export async function mockProjectsApi(page,{initial=[projectAlpha,projectBeta]}={}){
  const projects=initial.map(project=>({
    ...project,
    tasks:(project.tasks??[]).map(task=>({...task})),
  }));

  await page.route(/\/api\/project-statuses\/?$/,route=>fulfillJson(route,200,projectStatuses));

  await page.route(/\/api\/projects\/?$/,route=>{
    if(route.request().method()!=='GET'){
      return fulfillJson(route,405,{message:'Método não suportado'});
    }
    return fulfillJson(route,200,projects);
  });

  await page.route(/\/api\/projects\/([^/?#]+)\/tasks\/?$/,route=>{
    if(route.request().method()!=='POST'){
      return fulfillJson(route,405,{message:'Método não suportado'});
    }
    const parts=new URL(route.request().url()).pathname.split('/').filter(Boolean);
    const id=parts[parts.length-2];
    const project=projects.find(item=>item.id===id);
    if(!project)return fulfillJson(route,404,{message:'Projeto não encontrado'});
    const payload=route.request().postDataJSON()??{};
    const created={
      id:`task-${(project.tasks?.length??0)+1}`,
      title:payload.title,
      description:null,
      status:'pending',
      priority:payload.priority??'medium',
      dueDate:payload.dueDate??null,
    };
    project.tasks=[...(project.tasks??[]),created];
    return fulfillJson(route,201,created);
  });

  await page.route(/\/api\/projects\/([^/?#]+)\/tasks\/([^/?#]+)\/?$/,route=>{
    if(route.request().method()!=='PATCH'){
      return fulfillJson(route,405,{message:'Método não suportado'});
    }
    const parts=new URL(route.request().url()).pathname.split('/').filter(Boolean);
    const projectId=parts[parts.length-3];
    const taskId=parts[parts.length-1];
    const project=projects.find(item=>item.id===projectId);
    const task=project?.tasks?.find(item=>item.id===taskId);
    if(!task)return fulfillJson(route,404,{message:'Tarefa não encontrada'});
    Object.assign(task,route.request().postDataJSON()??{});
    return fulfillJson(route,200,task);
  });

  await page.route(/\/api\/projects\/([^/?#]+)\/notes\/?$/,route=>{
    if(route.request().method()!=='POST'){
      return fulfillJson(route,405,{message:'Método não suportado'});
    }
    return fulfillJson(route,201,{
      id:'activity-new',
      authorName:'Maria',
      createdAt:new Date().toISOString(),
      content:(route.request().postDataJSON()??{}).content,
    });
  });

  await page.route(/\/api\/projects\/([^/?#]+)\/?$/,route=>{
    const id=decodeURIComponent(new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1));
    const project=projects.find(item=>item.id===id);
    if(!project)return fulfillJson(route,404,{message:'Projeto não encontrado'});

    if(route.request().method()==='PATCH'){
      Object.assign(project,route.request().postDataJSON()??{});
      return fulfillJson(route,200,detailFrom(project));
    }

    return fulfillJson(route,200,detailFrom(project));
  });

  return projects;
}

export function todayIso(){
  return new Date().toISOString().slice(0,10);
}

export const calendarEventToday=()=>({
  id:'calendar-1',
  title:'Reunião com cliente',
  type:'meeting',
  startAt:`${todayIso()}T09:00:00`,
  endAt:`${todayIso()}T10:00:00`,
  location:'Escritório principal',
  description:'Alinhamento do projeto',
});

export const calendarVisitToday=()=>({
  id:'calendar-2',
  title:'Visita técnica',
  type:'visit',
  startAt:`${todayIso()}T14:00:00`,
  endAt:`${todayIso()}T15:00:00`,
  location:'Salão Aurora',
  description:null,
});

export async function mockCalendarApi(page,{initial=[calendarEventToday(),calendarVisitToday()],createError=null}={}){
  const events=initial.map(event=>({...event}));

  await page.route(/\/api\/calendar\/?$/,route=>{
    const method=route.request().method();

    if(method==='GET'){
      return fulfillJson(route,200,events);
    }

    if(method==='POST'){
      if(createError){
        return fulfillJson(route,createError.status??422,{
          message:createError.message??'Não foi possível salvar o evento',
        });
      }
      const payload=route.request().postDataJSON()??{};
      const created={id:`calendar-${events.length+1}`,...payload};
      events.push(created);
      return fulfillJson(route,201,created);
    }

    return fulfillJson(route,405,{message:'Método não suportado'});
  });

  return events;
}
