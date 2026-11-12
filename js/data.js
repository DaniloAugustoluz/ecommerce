// Catálogo de exemplo — troque imagens, preços e textos aqui.
const C = {
  grafite: ['Grafite', '#2a2a30', '#d3f23f'], preto: ['Preto Noite', '#141416', '#e2492b'],
  off: ['Off-white', '#ece6d9', '#1b1915'], vermelho: ['Vermelho Pista', '#e2492b', '#f4eee3'],
  volt: ['Verde Volt', '#c6ea35', '#1b1915'], azul: ['Azul Raia', '#2f5bea', '#f4eee3'],
  musgo: ['Verde Musgo', '#3f5f49', '#ece6d9'], rosa: ['Rosa Sprint', '#ee8aa3', '#1b1915'],
  lilas: ['Lilás Aurora', '#a48ad8', '#f4eee3'], areia: ['Areia', '#cdb893', '#1b1915'],
};
const cols = (...k) => k.map((n) => ({ name: C[n][0], hex: C[n][1], accent: C[n][2] }));
const RP = ['PP', 'P', 'M', 'G', 'GG'];

export const PRODUCTS = [
  { id: 'camiseta-aero', name: 'Camiseta Aero Dry', tag: 'Leve como a largada', cat: 'corrida', gender: 'u', slot: 'top', type: 'tee', price: 129.9, img: 'camiseta', colors: cols('vermelho', 'grafite', 'off', 'azul'), sizes: RP, twin: 'cropped-fluxo',
    desc: 'Malha furadinha de secagem rápida com costuras planas. Feita para quilômetros longos sem atrito.', feats: ['Secagem rápida', 'Proteção UV50+', 'Costura plana'] },
  { id: 'regata-pulse', name: 'Regata Pulse', tag: 'Ombros livres, treino pesado', cat: 'academia', gender: 'm', slot: 'top', type: 'tank', price: 99.9, img: 'regata', colors: cols('azul', 'grafite', 'volt', 'areia'), sizes: RP, twin: 'top-impulso',
    desc: 'Cava ampla e tecido respirável que acompanha cada repetição sem prender o movimento.', feats: ['Cava ampla', 'Respirável', 'Não desbota'] },
  { id: 'top-impulso', name: 'Top Impulso', tag: 'Sustentação que não aperta', cat: 'academia', gender: 'f', slot: 'top', type: 'bra', price: 119.9, img: 'top', colors: cols('rosa', 'preto', 'lilas', 'volt'), sizes: RP, twin: 'regata-pulse',
    desc: 'Média sustentação, alças cruzadas e bojo removível. Do agachamento ao sprint.', feats: ['Média sustentação', 'Bojo removível', 'Toque gelado'] },
  { id: 'legging-raia', name: 'Legging Raia 7/8', tag: 'Segunda pele, zero transparência', cat: 'academia', gender: 'f', slot: 'bottom', type: 'legging', price: 189.9, img: 'legging', colors: cols('preto', 'lilas', 'musgo', 'vermelho'), sizes: RP, twin: 'short-sprint',
    desc: 'Cintura alta compressiva e elastano 4 direções. Testada no agachamento: não marca, não desce.', feats: ['Cintura alta', 'Zero transparência', 'Bolso oculto'] },
  { id: 'short-sprint', name: 'Short Sprint 5"', tag: 'Feito para tiros curtos', cat: 'corrida', gender: 'm', slot: 'bottom', type: 'short', price: 139.9, img: 'short', colors: cols('preto', 'vermelho', 'azul', 'musgo'), sizes: RP, twin: 'legging-raia',
    desc: 'Ultraleve, com forro interno e bolso traseiro com zíper para chave e gel.', feats: ['Forro interno', 'Bolso com zíper', '98 g'] },
  { id: 'longa-termica', name: 'Manga Longa Térmica', tag: 'Para as manhãs frias', cat: 'corrida', gender: 'u', slot: 'top', type: 'long', price: 159.9, img: 'longa', colors: cols('grafite', 'off', 'musgo'), sizes: RP,
    desc: 'Segunda camada térmica que retém calor e libera suor. Punho com passador de dedo.', feats: ['Térmica', 'Passador de dedo', 'Antiodor'] },
  { id: 'jaqueta-vento', name: 'Jaqueta Corta-Vento', tag: 'O vento fica para trás', cat: 'corrida', gender: 'u', slot: 'top', type: 'jacket', price: 279.9, img: 'jaqueta', colors: cols('azul', 'vermelho', 'preto', 'volt'), sizes: RP,
    desc: 'Repelente à água, dobra dentro do próprio bolso e tem detalhes refletivos para treinos noturnos.', feats: ['Repele água', 'Refletiva', 'Dobrável'] },
  { id: 'cropped-fluxo', name: 'Cropped Fluxo', tag: 'Solto na medida certa', cat: 'academia', gender: 'f', slot: 'top', type: 'crop', price: 109.9, img: 'cropped', colors: cols('lilas', 'off', 'rosa'), sizes: RP, twin: 'camiseta-aero',
    desc: 'Modelagem curta e fluida, perfeita sobre o top. Malha fria com toque de algodão.', feats: ['Malha fria', 'Caimento fluido', 'Secagem rápida'] },
  { id: 'jogger-base', name: 'Jogger Base', tag: 'Do aquecimento ao café', cat: 'academia', gender: 'u', slot: 'bottom', type: 'jogger', price: 199.9, img: 'jogger', colors: cols('grafite', 'areia', 'musgo'), sizes: RP,
    desc: 'Moletinho tecnológico com punho na barra e faixa lateral. Conforto para antes e depois do treino.', feats: ['Punho na barra', 'Bolsos fundos', 'Elástico 4D'] },
  { id: 'relogio-cronos', name: 'Relógio Cronos GPS', tag: 'Cada segundo conta', cat: 'acessorios', gender: 'u', slot: 'watch', type: 'watch', price: 899.9, img: 'relogio', colors: cols('preto', 'vermelho', 'off', 'volt'), sizes: ['41 mm', '45 mm'],
    desc: 'GPS de dupla frequência, 14 dias de bateria e anéis de atividade. Pulseira de silicone respirável.', feats: ['GPS dupla banda', '14 dias de bateria', '5 ATM'] },
].map((p, i) => ({ ...p, lane: String(i + 1).padStart(2, '0') }));

export const byId = (id) => PRODUCTS.find((p) => p.id === id);
export const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const GENDER_LABEL = { m: 'Masculino', f: 'Feminino', u: 'Unissex' };
export const SLOT_LABEL = { top: 'Parte de cima', bottom: 'Parte de baixo', watch: 'Acessório' };
