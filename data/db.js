
export const db = {
  products: [
    { id:1, sku:'ASP-POP-001', slug:'aspersor-popup-orbit-ajustable', name:'Aspersor Pop-Up Orbit ajustable', short_name:'Aspersor Pop-Up', category_name:'Aspersores', line_name:'Riego residencial', short_description:'Ideal para césped, jardines y áreas verdes pequeñas o medianas.', long_description:'Aspersor residencial con patrón ajustable para riego eficiente.', main_image_url:'', manual_pdf_url:'', installation_video_url:'', difficulty_level:'Básico / Medio', usage_type:'Césped', is_featured:true, is_active:true, ai_enabled:true,
      specs:[
        {spec_key:'alcance',spec_label:'Alcance',spec_value:'0,1 - 4,5',spec_unit:'m'},
        {spec_key:'presion',spec_label:'Presión',spec_value:'20 - 50',spec_unit:'PSI'},
        {spec_key:'uso',spec_label:'Uso',spec_value:'Césped / jardín',spec_unit:''},
        {spec_key:'conexion',spec_label:'Conexión',spec_value:'1/4',spec_unit:'pulg'}
      ]
    },
    { id:2, sku:'BOQ-ADJ-001', slug:'boquilla-ajustable-orbit', name:'Boquilla ajustable Orbit', short_name:'Boquilla ajustable', category_name:'Boquillas', line_name:'Riego residencial', short_description:'Controla el patrón y la cobertura del aspersor.', main_image_url:'', is_active:true, ai_enabled:true, specs:[{spec_key:'tipo',spec_label:'Tipo',spec_value:'Ajustable',spec_unit:''}] },
    { id:3, sku:'PRO-DIG-001', slug:'programador-digital-orbit', name:'Programador digital Orbit', short_name:'Programador', category_name:'Programadores', line_name:'Riego automático', short_description:'Automatiza horarios de riego y ayuda a ahorrar agua.', main_image_url:'', is_active:true, ai_enabled:true, specs:[{spec_key:'uso',spec_label:'Uso',spec_value:'Automatización',spec_unit:''}] },
    { id:4, sku:'CON-014-001', slug:'conector-un-cuarto-orbit', name:'Conector 1/4 Orbit', short_name:'Conector 1/4', category_name:'Conectores', line_name:'Accesorios', short_description:'Permite unir el aspersor a la línea de riego.', main_image_url:'', is_active:true, specs:[] },
    { id:5, sku:'TUB-001', slug:'tuberia-riego-orbit', name:'Tubería de riego Orbit', short_name:'Tubería', category_name:'Tuberías', line_name:'Accesorios', short_description:'Tubería para llevar agua a cada zona del jardín.', main_image_url:'', is_active:true, specs:[] },
    { id:6, sku:'FIL-001', slug:'filtro-riego-orbit', name:'Filtro de riego Orbit', short_name:'Filtro', category_name:'Filtros', line_name:'Accesorios', short_description:'Protege el sistema de partículas.', is_active:true, specs:[] }
  ],
  recommendations: [
    {id:1, source_product_id:1, recommended_product_id:2, recommendation_type:'Clave', reason:'Controla la salida y cobertura', priority:1},
    {id:2, source_product_id:1, recommended_product_id:4, recommendation_type:'Necesario', reason:'Une el aspersor a la línea', priority:2},
    {id:3, source_product_id:1, recommended_product_id:5, recommendation_type:'Según área', reason:'Necesaria para distribuir el agua', priority:3},
    {id:4, source_product_id:1, recommended_product_id:3, recommendation_type:'Premium', reason:'Automatiza horarios de riego', priority:4},
    {id:5, source_product_id:1, recommended_product_id:6, recommendation_type:'Recomendado', reason:'Protege el sistema de partículas', priority:5},
    {id:6, source_product_id:2, recommended_product_id:1, recommendation_type:'Compatible', reason:'Aspersor compatible con esta boquilla', priority:1},
    {id:7, source_product_id:3, recommended_product_id:1, recommendation_type:'Compatible', reason:'Para crear un sistema automático completo', priority:1}
  ],
  qrs: [
    { id:1, product_id:1, qr_code:'ASP-POP-001', qr_url:'qr.html?qr=ASP-POP-001', store_name:'Demo Retail', store_branch:'Sodimac Demo', region:'Metropolitana', campaign_name:'Demo inicial', is_active:true }
  ],
  leads: [
    { id:1, email:'cliente.demo@email.com', name:'Cliente Demo', product_id:1, qr_id:1, source:'ficha_producto', accepts_marketing:true, contacted:false, created_at:new Date().toISOString() }
  ],
  questions: [],
  scans: [],
  categories: [
    {id:1,name:'Aspersores',slug:'aspersores',is_active:true},
    {id:2,name:'Boquillas',slug:'boquillas',is_active:true},
    {id:3,name:'Programadores',slug:'programadores',is_active:true},
    {id:4,name:'Conectores',slug:'conectores',is_active:true},
    {id:5,name:'Tuberías',slug:'tuberias',is_active:true}
  ],
  lines: [
    {id:1,name:'Riego residencial',slug:'riego-residencial',is_active:true},
    {id:2,name:'Riego automático',slug:'riego-automatico',is_active:true},
    {id:3,name:'Accesorios',slug:'accesorios',is_active:true}
  ]
};
