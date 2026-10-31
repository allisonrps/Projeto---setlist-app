const fs = require('fs');
const path = require('path');

const useLanguagePath = path.resolve(__dirname, '../hooks/useLanguage.js');
const content = fs.readFileSync(useLanguagePath, 'utf8');
const match = content.match(/const translations = (\{[\s\S]*?\n\};)/);
if (!match) {
  console.error('Could not extract translations from useLanguage.js');
  process.exit(1);
}

const dict = eval('(' + match[1].slice(0, -1) + ')');

// Comprehensive web editor translations
const webExtra = {
  eventSingular: {"pt":"Evento","en":"Event","es":"Evento"},
  clickToEditEventAndPlaylist: {"pt":"Clique para editar evento e playlist","en":"Click to edit event and setlist","es":"Clic para editar evento y setlist"},
  loadingPosts: {"pt":"Carregando lembretes...","en":"Loading reminders...","es":"Cargando recordatorios..."},
  noPostsPublishedYet: {"pt":"Nenhum lembrete publicado ainda","en":"No reminders published yet","es":"Ningún recordatorio publicado aún"},
  noPostsSubtitle: {"pt":"Use o botão Novo Lembrete acima para compartilhar recados, escalas ou avisos importantes com a banda.","en":"Use the New Reminder button above to share messages, rosters, or important band notices.","es":"Usa el botón Nuevo Recordatorio de arriba para compartir avisos, turnos o notas importantes."},
  addEventsCronogramSubtitle: {"pt":"Adicione novos shows ou ensaios para montar o cronograma.","en":"Add new gigs or rehearsals to build your tour schedule.","es":"Añade nuevos conciertos o ensayos para armar el cronograma."},
  noFinancialEntriesInYear: {"pt":"Nenhum lançamento financeiro em","en":"No financial entries in","es":"Ningún movimiento financiero en"},
  addFinanceEntryBtn: {"pt":"Adicionar Lançamento","en":"Add Entry","es":"Añadir Movimiento"},
  allCount: {"pt":"Todas","en":"All","es":"Todas"},
  showingSongsCount: {"pt":"Exibindo","en":"Showing","es":"Mostrando"},
  ofCount: {"pt":"de","en":"of","es":"de"},
  groupedByArtist: {"pt":"Agrupado por Banda/Artista","en":"Grouped by Band/Artist","es":"Agrupado por Banda/Artista"},
  alphabeticalOrder: {"pt":"Ordem Alfabética de Músicas","en":"Alphabetical Order of Songs","es":"Orden Alfabético de Canciones"},
  noSongsInRepertoireYet: {"pt":"Nenhuma música no repertório desta banda","en":"No songs in this band repertoire yet","es":"Ninguna canción en el repertorio de esta banda"},
  addSongsFromSongbookSubtitle: {"pt":"Adicione músicas do seu Songbook para sincronizar cifras e setlists com os integrantes.","en":"Add songs from your Songbook to sync chords and setlists with band members.","es":"Añade canciones de tu Songbook para sincronizar acordes y setlists con los miembros."},
  sortByLabel: {"pt":"Ordenar por","en":"Sort by","es":"Ordenar por"},
  flyerStep2ScaleTitle: {"pt":"2. Escala / Tamanho dos Cards de Show","en":"2. Show Cards Scale / Size","es":"2. Escala / Tamaño de las Tarjetas"},
  decreaseCardSizeTooltip: {"pt":"Diminuir tamanho dos cards","en":"Decrease card size","es":"Disminuir tamaño de tarjetas"},
  increaseCardSizeTooltip: {"pt":"Aumentar tamanho dos cards","en":"Increase card size","es":"Aumentar tamaño de tarjetas"},
  flyerSelectShowsLabel: {"pt":"3. Selecionar Shows na Arte","en":"3. Select Shows for the Poster","es":"3. Seleccionar Conciertos en el Cartel"},
  selectUpcomingBtn: {"pt":"Selecionar Próximos","en":"Select Upcoming","es":"Seleccionar Próximos"},
  monthJan: {"pt":"Janeiro","en":"January","es":"Enero"},
  monthFeb: {"pt":"Fevereiro","en":"February","es":"Febrero"},
  monthMar: {"pt":"Março","en":"March","es":"Marzo"},
  monthApr: {"pt":"Abril","en":"April","es":"Abril"},
  monthMay: {"pt":"Maio","en":"May","es":"Mayo"},
  monthJun: {"pt":"Junho","en":"June","es":"Junio"},
  monthJul: {"pt":"Julho","en":"July","es":"Julio"},
  monthAug: {"pt":"Agosto","en":"August","es":"Agosto"},
  monthSep: {"pt":"Setembro","en":"September","es":"Septiembre"},
  monthOct: {"pt":"Outubro","en":"October","es":"Octubre"},
  monthNov: {"pt":"Novembro","en":"November","es":"Noviembre"},
  monthDec: {"pt":"Dezembro","en":"December","es":"Diciembre"},
  weekdaySunShort: {"pt":"DOM","en":"SUN","es":"DOM"},
  weekdayMonShort: {"pt":"SEG","en":"MON","es":"LUN"},
  weekdayTueShort: {"pt":"TER","en":"TUE","es":"MAR"},
  weekdayWedShort: {"pt":"QUA","en":"WED","es":"MIÉ"},
  weekdayThuShort: {"pt":"QUI","en":"THU","es":"JUE"},
  weekdayFriShort: {"pt":"SEX","en":"FRI","es":"VIE"},
  weekdaySatShort: {"pt":"SÁB","en":"SAT","es":"SÁB"},
  weekdaySunFull: {"pt":"Domingo","en":"Sunday","es":"Domingo"},
  weekdayMonFull: {"pt":"Segunda","en":"Monday","es":"Lunes"},
  weekdayTueFull: {"pt":"Terça","en":"Tuesday","es":"Martes"},
  weekdayWedFull: {"pt":"Quarta","en":"Wednesday","es":"Miércoles"},
  weekdayThuFull: {"pt":"Quinta","en":"Thursday","es":"Jueves"},
  weekdayFriFull: {"pt":"Sexta","en":"Friday","es":"Viernes"},
  weekdaySatFull: {"pt":"Sábado","en":"Saturday","es":"Sábado"},
  newEventModalTitle: {"pt":"Novo Evento na Agenda","en":"New Calendar Event","es":"Nuevo Evento en la Agenda"},
  eventBandSelectLabel: {"pt":"Vincular a uma Banda (Opcional)","en":"Link to a Band (Optional)","es":"Vincular a una Banda (Opcional)"},
  eventSoloOption: {"pt":"Apresentação Solo / Sem Banda","en":"Solo Performance / No Band","es":"Presentación Solo / Sin Banda"},
  eventCacheLabel: {"pt":"Cachê Estimado (Opcional)","en":"Estimated Fee (Optional)","es":"Caché Estimado (Opcional)"},
  eventCachePlaceholder: {"pt":"Ex: R$ 1.500,00","en":"e.g. $ 1,500.00","es":"Ej: $ 1.500,00"},
  eventNotesPlaceholder: {"pt":"Repertório escolhido, passagem de som...","en":"Setlist chosen, soundcheck, contact...","es":"Repertorio elegido, prueba de sonido..."},
  saveEventBtn: {"pt":"Salvar Evento","en":"Save Event","es":"Guardar Evento"},
  shareAgendaModalTitle: {"pt":"Compartilhar Agenda de Shows (Flyer Oficial)","en":"Share Tour Schedule (Official Flyer)","es":"Compartir Agenda de Conciertos (Flyer Oficial)"},
  shareAgendaModalSubtitle: {"pt":"Gerador oficial de arte para redes sociais e WhatsApp com os mesmos temas e fundos do app mobile","en":"Official flyer generator for social media & WhatsApp with the same mobile themes and backgrounds","es":"Generador oficial de arte para redes sociales y WhatsApp con los mismos temas y fondos de la app"},
  flyerStep1Title: {"pt":"1. Estilo / Arte de Fundo","en":"1. Style / Background Art","es":"1. Estilo / Arte de Fondo"},
  flyerThemeRock: {"pt":"Rock & Metal","en":"Rock & Metal","es":"Rock y Metal"},
  flyerThemeFolk: {"pt":"Acústico Folk","en":"Acoustic Folk","es":"Acústico Folk"},
  flyerThemeSynth: {"pt":"Synthwave","en":"Synthwave","es":"Synthwave"},
  flyerThemeJazz: {"pt":"Jazz & Blues","en":"Jazz & Blues","es":"Jazz y Blues"},
  flyerThemeEdm: {"pt":"Eletrônica EDM","en":"Electronic EDM","es":"Electrónica EDM"},
  flyerThemeReggae: {"pt":"Reggae Roots","en":"Reggae Roots","es":"Reggae Roots"},
  flyerThemeGospel: {"pt":"Gospel","en":"Gospel","es":"Góspel"},
  flyerThemeNotes: {"pt":"Notas","en":"Notes","es":"Notas"},
  flyerThemeClassic: {"pt":"Clássico","en":"Classic","es":"Clásico"},
  flyerCustomBgLabel: {"pt":"Escolher Foto da Galeria (Fundo Personalizado)","en":"Choose Photo from Gallery (Custom Background)","es":"Elegir Foto de la Galería (Fondo Personalizado)"},
  flyerStep2Title: {"pt":"2. Título & Subtítulo do Topo","en":"2. Top Title & Subtitle","es":"2. Título y Subtítulo Superior"},
  flyerStep3Title: {"pt":"3. Seleção de Shows para o Cartaz","en":"3. Select Shows for the Poster","es":"3. Selección de Conciertos para el Cartel"},
  flyerStep4Title: {"pt":"4. Linha de Contato / Texto Livre para a Banda","en":"4. Contact Line / Custom Text for Band","es":"4. Línea de Contacto / Texto Libre de la Banda"},
  flyerContactPlaceholder: {"pt":"Ex: Contato para Shows: (16) 99115-3733 • @badbadgersoficial","en":"e.g. Booking: (555) 123-4567 • @bandhandle","es":"Ej: Contacto para Shows: (16) 99115-3733 • @labanda"},
  flyerContactNote: {"pt":"Esta linha personalizada é exibida com destaque logo acima da chamada do BandLink.","en":"This custom line is prominently displayed right above the BandLink footer.","es":"Esta línea personalizada se muestra destacada justo encima del pie de BandLink."},
  flyerDownloadBtn: {"pt":"Baixar Arte (PNG 1080x1920)","en":"Download Flyer (PNG 1080x1920)","es":"Descargar Arte (PNG 1080x1920)"},
  copyTextBtn: {"pt":"Copiar Texto","en":"Copy Text","es":"Copiar Texto"},
  flyerCopyTextTooltip: {"pt":"Copiar texto formatado para WhatsApp","en":"Copy formatted text for WhatsApp","es":"Copiar texto formateado para WhatsApp"},
  flyerAgendaHeader: {"pt":"AGENDA","en":"SCHEDULE","es":"AGENDA"},
  flyerUpcomingShows: {"pt":"PRÓXIMOS SHOWS","en":"UPCOMING GIGS","es":"PRÓXIMOS CONCIERTOS"},
  flyerFooterBrandText: {"pt":"Gerencie sua banda, playlists, cifras. Crie seu perfil e divulgue novos projetos para encontrar novos músicos.","en":"Manage your band, setlists, and chords. Create your profile and announce new projects to find musicians.","es":"Gestiona tu banda, setlists y acordes. Crea tu perfil y publica nuevos proyectos para encontrar músicos."},
  flyerScanQrText: {"pt":"ESCANEAR","en":"SCAN ME","es":"ESCANEAR"},
  editEventPlaylistModalTitle: {"pt":"Editar Evento & Playlist","en":"Edit Event & Setlist","es":"Editar Evento y Setlist"},
  eventDetailsTab: {"pt":"Detalhes do Evento","en":"Event Details","es":"Detalles del Evento"},
  eventPlaylistTab: {"pt":"Playlist","en":"Setlist","es":"Setlist"},
  exportDocBtn: {"pt":"Exportar .DOC","en":"Export .DOC","es":"Exportar .DOC"},
  exportDocTitle: {"pt":"Exportar Roteiro Word (.doc)","en":"Export Word Document (.doc)","es":"Exportar Documento Word (.doc)"},
  eventNameLabel: {"pt":"Nome do Evento / Show / Ensaio *","en":"Event / Gig / Rehearsal Name *","es":"Nombre del Evento / Concierto / Ensayo *"},
  eventNamePlaceholder: {"pt":"Ex: Barteco 07/11","en":"e.g. Rock Fest 10/12","es":"Ej: Festival Rock 07/11"},
  eventTypeShowOption: {"pt":"Show / Apresentação","en":"Gig / Show","es":"Concierto / Show"},
  eventTypeRehearsalOption: {"pt":"Ensaio","en":"Rehearsal","es":"Ensayo"},
  eventNotesDetailedPlaceholder: {"pt":"Informações de som, horário de passagem, contato da casa...","en":"Soundcheck time, venue contact, backstage notes...","es":"Horario de prueba de sonido, contacto del local, notas..."},
  songsInThisSetlistLabel: {"pt":"Músicas neste Setlist:","en":"Songs in this Setlist:","es":"Canciones en este Setlist:"},
  totalDurationPrefix: {"pt":"Duração Total:","en":"Total Duration:","es":"Duración Total:"},
  addSongShort: {"pt":"+ Música","en":"+ Song","es":"+ Canción"},
  addPauseShort: {"pt":"+ Pausa","en":"+ Pause","es":"+ Pausa"},
  addNoteShort: {"pt":"+ Anotação","en":"+ Note","es":"+ Nota"},
  dedicatedPageBtn: {"pt":"Página Própria","en":"Full Page","es":"Página Propia"},
  dedicatedPageTooltip: {"pt":"Abrir na página de eventos","en":"Open in dedicated event editor","es":"Abrir en página de eventos"},
  deleteEventBtn: {"pt":"Excluir Evento","en":"Delete Event","es":"Eliminar Evento"},
  duplicateSetlistTooltip: {"pt":"Duplicar esta playlist e evento","en":"Duplicate this setlist and event","es":"Duplicar este setlist y evento"},
  saveChangesBtn: {"pt":"Salvar Alterações","en":"Save Changes","es":"Guardar Cambios"},
  newEventOrShowTitle: {"pt":"Novo Evento / Show","en":"New Event / Gig","es":"Nuevo Evento / Concierto"},
  badgeNew: {"pt":"NOVO","en":"NEW","es":"NUEVO"},
  editInfoPrefix: {"pt":"Editar Informações:","en":"Edit Info:","es":"Editar Información:"},
  editPrefix: {"pt":"Editar:","en":"Edit:","es":"Editar:"},
  changeBandPhotoTitle: {"pt":"Alterar foto da banda","en":"Change band photo","es":"Cambiar foto de la banda"},
  bandHomeTabTooltip: {"pt":"Home e Lembretes da Banda","en":"Band Home & Reminders","es":"Inicio y Recordatorios de la Banda"},
  bandMembersTabTooltip: {"pt":"Integrantes e Membros","en":"Band Members","es":"Integrantes y Miembros"},
  bandRepertoireTabTooltip: {"pt":"Repertório da Banda","en":"Band Repertoire","es":"Repertorio de la Banda"},
  bandFinancesTabTooltip: {"pt":"Finanças e Lançamentos","en":"Finances & Transactions","es":"Finanzas y Movimientos"},
  bandAgendaTabTooltip: {"pt":"Agenda da Banda","en":"Band Schedule","es":"Agenda de la Banda"},
  bandHomeSectionTitle: {"pt":"Home da Banda","en":"Band Home","es":"Inicio de la Banda"},
  bandHomeSubtitle: {"pt":"Quadro de avisos, lembretes fixados e novidades da banda","en":"Notice board, pinned reminders, and band updates","es":"Tablón de anuncios, recordatorios fijados y novedades"},
  recentActivitiesTitle: {"pt":"Atividades Recentes & Histórico","en":"Recent Activity & Log","es":"Actividad Reciente e Historial"},
  addMemberBtn: {"pt":"Adicionar Integrante","en":"Add Member","es":"Añadir Miembro"},
  noMembersRegistered: {"pt":"Nenhum integrante cadastrado nesta banda ainda.","en":"No members registered in this band yet.","es":"Ningún miembro registrado en esta banda aún."},
  registerFirstMemberBtn: {"pt":"Cadastrar Primeiro Integrante","en":"Register First Member","es":"Registrar Primer Miembro"},
  leaderBadge: {"pt":"LÍDER","en":"LEADER","es":"LÍDER"},
  extraDifferentialTooltip: {"pt":"Diferencial Extra-Musical","en":"Extra / Production Skill","es":"Habilidad Extra / Producción"},
  addSongsFromSongbookBtn: {"pt":"Adicionar Músicas do Songbook","en":"Add Songs from Songbook","es":"Añadir Canciones del Songbook"},
  searchRepertoirePlaceholder: {"pt":"Buscar no repertório por música ou artista...","en":"Search repertoire by song or artist...","es":"Buscar en repertorio por canción o artista..."},
  noRepertoireSongs: {"pt":"Nenhuma música adicionada ao repertório da banda.","en":"No songs added to the band repertoire yet.","es":"Ninguna canción añadida al repertorio de la banda."},
  financesTitle: {"pt":"Finanças","en":"Finances","es":"Finanzas"},
  bandCashBtn: {"pt":"Caixa","en":"Treasury","es":"Caja"},
  newFinanceEntryBtn: {"pt":"Novo Lançamento","en":"New Entry","es":"Nuevo Movimiento"},
  revenueLabel: {"pt":"Receita","en":"Revenue","es":"Ingresos"},
  cashLabel: {"pt":"Caixa","en":"Treasury","es":"Caja"},
  expensesLabel: {"pt":"Despesas","en":"Expenses","es":"Gastos"},
  totalGrossCache: {"pt":"Cachê Total Bruto","en":"Total Gross Fee","es":"Caché Total Bruto"},
  statusPaid: {"pt":"Recebido","en":"Paid","es":"Cobrado"},
  statusPending: {"pt":"Pendente","en":"Pending","es":"Pendiente"},
  splitEquallyBtn: {"pt":"Dividir Igualmente","en":"Split Equally","es":"Dividir en Partes Iguales"},
  bandCashFund: {"pt":"Caixa da Banda","en":"Band Treasury","es":"Caja de la Banda"},
  membersQuotaTitle: {"pt":"Cota dos Integrantes","en":"Members Share","es":"Cuota de Integrantes"},
  substitutesGuestsTitle: {"pt":"Substitutos e Convidados","en":"Substitutes & Guests","es":"Suplentes e Invitados"},
  showTotalLabel: {"pt":"Total do Show","en":"Gig Total","es":"Total del Concierto"},
  bandCashLabel: {"pt":"Caixa da Banda","en":"Band Treasury","es":"Caja de la Banda"},
  musiciansTotalLabel: {"pt":"Total Músicos","en":"Musicians Total","es":"Total Músicos"},
  remainingBalanceLabel: {"pt":"Saldo Restante","en":"Remaining Balance","es":"Saldo Restante"},
  saveCacheSplitBtn: {"pt":"Salvar Divisão de Cachê","en":"Save Fee Split","es":"Guardar División de Caché"},
  adjustBandCashModalTitle: {"pt":"Ajustar Caixa da Banda","en":"Adjust Band Treasury","es":"Ajustar Caja de la Banda"},
  availableReserveFund: {"pt":"Fundo de reserva disponível","en":"Available reserve fund","es":"Fondo de reserva disponible"},
  bandCashBalanceLabel: {"pt":"Saldo do Caixa da Banda (R$) *","en":"Band Treasury Balance ($) *","es":"Saldo de la Caja de la Banda ($) *"},
  bandCashSaveNote: {"pt":"Ao salvar, este valor se tornará o saldo oficial do fundo de reserva da banda.","en":"When saved, this amount becomes the official balance of the band reserve fund.","es":"Al guardar, este valor se convertirá en el saldo oficial del fondo de reserva de la banda."},
  adjustmentReasonLabel: {"pt":"Motivo do Ajuste (Opcional)","en":"Adjustment Reason (Optional)","es":"Motivo del Ajuste (Opcional)"},
  adjustmentReasonPlaceholder: {"pt":"Ex: Aporte inicial, conferência de saldo, retirada...","en":"e.g. Initial deposit, audit, withdrawal...","es":"Ej: Aporte inicial, verificación de saldo, retiro..."},
  saveBalanceBtn: {"pt":"Salvar Saldo","en":"Save Balance","es":"Guardar Saldo"},
  quickCreationTab: {"pt":"Criação Rápida","en":"Quick Add","es":"Creación Rápida"},
  pasteBatchListTab: {"pt":"Colar Lista em Lote","en":"Paste Batch List","es":"Pegar Lista en Lote"},
  quickCreationSubtitle: {"pt":"Criação simples e rápida — informe o nome e a banda. Depois você pode editar cifras, letras e detalhes diretamente no Songbook.","en":"Fast and simple — enter song title and band. You can edit chords, lyrics, and details directly in Songbook later.","es":"Creación simple y rápida — indica el nombre y la banda. Luego puedes editar acordes, letras y detalles en el Songbook."},
  addSongPlusBtn: {"pt":"Adicionar Música (+)","en":"Add Song (+)","es":"Añadir Canción (+)"},
  batchRegisterPrompt: {"pt":"Quer cadastrar uma lista inteira de uma vez?","en":"Want to register an entire list at once?","es":"¿Quieres registrar una lista completa de una vez?"},
  pasteSongListBtn: {"pt":"Colar Lista de Músicas","en":"Paste Song List","es":"Pegar Lista de Canciones"},
  batchPasteSubtitle: {"pt":"Cole sua lista de músicas (uma por linha). O sistema irá identificar as faixas e criá-las automaticamente no Songbook.","en":"Paste your song list (one per line). The system will identify tracks and automatically create them in Songbook.","es":"Pega tu lista de canciones (una por línea). El sistema identificará las pistas y las creará en el Songbook."},
  batchListFormatLabel: {"pt":"Formato da Lista:","en":"List Format:","es":"Formato de la Lista:"},
  formatBandSong: {"pt":"Banda — Música","en":"Band — Song","es":"Banda — Canción"},
  formatSongBand: {"pt":"Música — Banda","en":"Song — Band","es":"Canción — Banda"},
  pasteListBelowLabel: {"pt":"Cole sua lista abaixo:","en":"Paste your list below:","es":"Pega tu lista abajo:"},
  zeroSongsDetected: {"pt":"0 músicas detectadas","en":"0 songs detected","es":"0 canciones detectadas"},
  songDetectedSingular: {"pt":"música detectada","en":"song detected","es":"canción detectada"},
  songsDetectedPlural: {"pt":"músicas detectadas","en":"songs detected","es":"canciones detectadas"},
  recognitionPreviewTitle: {"pt":"Pré-visualização do Reconhecimento:","en":"Detection Preview:","es":"Vista Previa del Reconocimiento:"},
  back: {"pt":"Voltar","en":"Back","es":"Volver"},
  createSongsFromListBtn: {"pt":"Criar Músicas da Lista (+)","en":"Create Songs from List (+)","es":"Crear Canciones de la Lista (+)"},
  stars5Master: {"pt":"⭐⭐⭐⭐⭐ 5 Estrelas (Mestre / Avançado)","en":"⭐⭐⭐⭐⭐ 5 Stars (Master / Advanced)","es":"⭐⭐⭐⭐⭐ 5 Estrellas (Maestro / Avanzado)"},
  stars4VeryGood: {"pt":"⭐⭐⭐⭐ 4 Estrelas (Muito Bom)","en":"⭐⭐⭐⭐ 4 Stars (Very Good)","es":"⭐⭐⭐⭐ 4 Estrellas (Muy Bueno)"},
  stars3Intermediate: {"pt":"⭐⭐⭐ 3 Estrelas (Intermediário)","en":"⭐⭐⭐ 3 Stars (Intermediate)","es":"⭐⭐⭐ 3 Estrellas (Intermedio)"},
  stars2Basic: {"pt":"⭐⭐ 2 Estrelas (Básico)","en":"⭐⭐ 2 Stars (Basic)","es":"⭐⭐ 2 Estrellas (Básico)"},
  stars1Beginner: {"pt":"⭐ 1 Estrela (Iniciante)","en":"⭐ 1 Star (Beginner)","es":"⭐ 1 Estrella (Principiante)"},
  extraSkillTransport: {"pt":"🚐 Transporte Próprio (Van / Carro)","en":"🚐 Own Transportation (Van / Car)","es":"🚐 Transporte Propio (Furgoneta / Auto)"},
  extraSkillSoundPA: {"pt":"🎛️ Técnico de Som / PA","en":"🎛️ Sound Engineer / PA","es":"🎛️ Técnico de Sonido / PA"},
  extraSkillGraphicDesign: {"pt":"🎨 Design Gráfico & Flyers","en":"🎨 Graphic Design & Flyers","es":"🎨 Diseño Gráfico y Flyers"},
  extraSkillVideo: {"pt":"🎬 Filmagem & Edição de Vídeo","en":"🎬 Video Filming & Editing","es":"🎬 Grabación y Edición de Video"},
  extraSkillSocialMedia: {"pt":"📱 Social Media & Anúncios","en":"📱 Social Media & Ads","es":"📱 Redes Sociales y Anuncios"},
  extraSkillRoadie: {"pt":"🔧 Roadie & Montagem de Palco","en":"🔧 Roadie & Stage Crew","es":"🔧 Roadie y Montaje de Escenario"},
  extraSkillBooking: {"pt":"💼 Venda de Shows & Booking","en":"💼 Gig Booking & Sales","es":"💼 Venta de Conciertos y Booking"},
  extraSkillLuthier: {"pt":"🎸 Luthieria & Regulagem","en":"🎸 Luthiery & Instrument Setup","es":"🎸 Lutería y Calibración"},
  extraSkillPhotography: {"pt":"📸 Fotografia Profissional","en":"📸 Professional Photography","es":"📸 Fotografía Profesional"},
  extraSkillLighting: {"pt":"💡 Técnico de Iluminação / Luz","en":"💡 Lighting Technician","es":"💡 Técnico de Iluminación"},
  extraSkillMusicProd: {"pt":"🎹 Produção Musical & Gravação","en":"🎹 Music Production & Recording","es":"🎹 Producción Musical y Grabación"},
  zeroSongsCount: {"pt":"0 músicas","en":"0 songs","es":"0 canciones"},
  socialInstagramPlaceholder: {"pt":"@seu.perfil","en":"@your.handle","es":"@tu.perfil"},
  socialYoutubePlaceholder: {"pt":"https://youtube.com/@seucanal","en":"https://youtube.com/@yourchannel","es":"https://youtube.com/@tucanal"},
  socialSpotifyPlaceholder: {"pt":"https://open.spotify.com/artist/...","en":"https://open.spotify.com/artist/...","es":"https://open.spotify.com/artist/..."},
  socialTwitterPlaceholder: {"pt":"@seutwitter","en":"@yourhandle","es":"@tuusuario"},
  changePhotoTitle: {"pt":"Alterar foto","en":"Change photo","es":"Cambiar foto"},
  yearsOldSuffix: {"pt":"anos","en":"years old","es":"años"},
  setLocationPrompt: {"pt":"Informe sua localização","en":"Set your location","es":"Indica tu ubicación"},
  statusAvailable: {"pt":"Disponível","en":"Available","es":"Disponible"},
  statusUnavailable: {"pt":"Indisponível","en":"Unavailable","es":"No disponible"},
  profileBioTab: {"pt":"Bio","en":"Bio","es":"Bio"},
  profileSkillsTab: {"pt":"Habilidades","en":"Skills","es":"Habilidades"},
  profileGearTab: {"pt":"Equipamentos","en":"Gear","es":"Equipos"},
  profileBandsTab: {"pt":"Bandas e Projetos","en":"Bands & Projects","es":"Bandas y Proyectos"},
  profileAgendaTab: {"pt":"Agenda","en":"Schedule","es":"Agenda"},
  bioPlaceholderPrompt: {"pt":"Conte um pouco sobre sua trajetória musical, bandas anteriores, preferências de repertório...","en":"Tell us a bit about your musical background, past bands, repertoire preferences...","es":"Cuéntanos un poco sobre tu trayectoria musical, bandas anteriores, preferencias de repertorio..."},
  bioHobbieTooltip: {"pt":"Clique para alternar: Hobbie","en":"Click to toggle: Hobby","es":"Clic para alternar: Pasatiempo"},
  bioProfessionalTooltip: {"pt":"Clique para alternar: Profissional","en":"Click to toggle: Professional","es":"Clic para alternar: Profesional"},
  bioCasualTooltip: {"pt":"Clique para alternar: Casual","en":"Click to toggle: Casual","es":"Clic para alternar: Casual"},
  bioAvailabilityTooltip: {"pt":"Clique para alternar entre Disponível e Indisponível","en":"Click to toggle between Available and Unavailable","es":"Clic para alternar entre Disponible y No disponible"},
  noInfluencesPrompt: {"pt":"Nenhuma influência cadastrada. Clique no botão de editar acima para adicionar suas referências.","en":"No musical influences registered yet. Click the edit button above to add your references.","es":"No hay influencias registradas aún. Haz clic en el botón de editar arriba para añadir tus referencias."},
  addInfluenceBtn: {"pt":"Adicionar Influência","en":"Add Influence","es":"Añadir Influencia"},
  saveInfluencesBtn: {"pt":"Salvar Influências","en":"Save Influences","es":"Guardar Influencias"},
  bioSocialLinksTitle: {"pt":"Links Sociais","en":"Social Links","es":"Enlaces Sociales"},
  editSocialLinksTitle: {"pt":"Editar Links Sociais","en":"Edit Social Links","es":"Editar Enlaces Sociales"},
  saveLinksBtn: {"pt":"Salvar Links","en":"Save Links","es":"Guardar Enlaces"},
  noSocialsPrompt: {"pt":"Nenhuma rede social informada.","en":"No social networks linked yet.","es":"Ninguna red social informada."},
  socialInstagramLabel: {"pt":"Instagram (@perfil)","en":"Instagram (@handle)","es":"Instagram (@perfil)"},
  socialYoutubeLabel: {"pt":"YouTube (Link ou Canal)","en":"YouTube (Link or Channel)","es":"YouTube (Enlace o Canal)"},
  socialSpotifyLabel: {"pt":"Spotify (Link Artista)","en":"Spotify (Artist Link)","es":"Spotify (Enlace de Artista)"},
  socialTwitterLabel: {"pt":"X / Twitter (@usuario)","en":"X / Twitter (@handle)","es":"X / Twitter (@usuario)"},
  skillsMusicalTitle: {"pt":"Musicais","en":"Musical","es":"Musicales"},
  addMusicalSkillTitle: {"pt":"Adicionar Habilidade Musical","en":"Add Musical Skill","es":"Añadir Habilidad Musical"},
  skillsExtrasTitle: {"pt":"Extras","en":"Extras","es":"Extras"},
  addExtraSkillTitle: {"pt":"Adicionar Habilidade Extra","en":"Add Extra Skill","es":"Añadir Habilidad Extra"},
  noExtraSkillsPrompt: {"pt":"Nenhum diferencial extra cadastrado","en":"No extra skills registered yet","es":"Ninguna habilidad extra registrada"},
  extraSkillsSubtitle: {"pt":"Adicione diferenciais que ajudam muito uma banda (van, som de PA, flyers, etc.).","en":"Add production and logistical skills that help a band (van, PA sound, flyers, etc.).","es":"Añade diferenciales que ayudan mucho a una banda (furgoneta, sonido PA, volantes, etc.)."},
  gearTitle: {"pt":"Equipamentos","en":"Gear","es":"Equipos"},
  addGearTitle: {"pt":"Adicionar Equipamento","en":"Add Gear","es":"Añadir Equipo"},
  negotiable: {"pt":"Negociável","en":"Negotiable","es":"Negociable"},
  addGearModalTitle: {"pt":"Adicionar Equipamento","en":"Add Gear","es":"Añadir Equipo"},
  editGearModalTitle: {"pt":"Editar Equipamento","en":"Edit Gear","es":"Editar Equipo"},
  gearCategoryLabel: {"pt":"Categoria","en":"Category","es":"Categoría"},
  gearBrandModelLabel: {"pt":"Marca / Modelo *","en":"Brand / Model *","es":"Marca / Modelo *"},
  gearDetailsLabel: {"pt":"Detalhes Adicionais (Opcional)","en":"Additional Details (Optional)","es":"Detalles Adicionales (Opcional)"},
  gearDetailsPlaceholder: {"pt":"Ano, captação, regulagem, notas...","en":"Year, pickups, setup, notes...","es":"Año, pastillas, calibración, notas..."},
  gearNegotiableLabel: {"pt":"Negociável","en":"Negotiable","es":"Negociable"},
  gearPriceLabel: {"pt":"Valor Estimado (R$)","en":"Estimated Price ($)","es":"Valor Estimado ($)"},
  gearCategoryGuitar: {"pt":"Guitarra","en":"Guitar","es":"Guitarra"},
  gearCategoryAcoustic: {"pt":"Violão","en":"Acoustic Guitar","es":"Guitarra Acústica"},
  gearCategoryBass: {"pt":"Baixo","en":"Bass","es":"Bajo"},
  gearCategoryDrums: {"pt":"Bateria / Percussão","en":"Drums / Percussion","es":"Batería / Percusión"},
  gearCategoryKeys: {"pt":"Teclado / Sintetizador","en":"Keys / Synthesizer","es":"Teclado / Sintetizador"},
  gearCategoryAmp: {"pt":"Amplificador","en":"Amplifier","es":"Amplificador"},
  gearCategoryPedal: {"pt":"Pedal","en":"Pedal / Effects","es":"Pedal / Efectos"},
  gearCategoryMic: {"pt":"Microfone","en":"Microphone","es":"Micrófono"},
  gearCategoryOther: {"pt":"Outros","en":"Other","es":"Otros"},
  openFullEditorBtn: {"pt":"Abrir Editor Completo","en":"Open Full Editor","es":"Abrir Editor Completo"},
  openFullEditorTooltip: {"pt":"Abrir editor completo de cifras e letras","en":"Open full chord and lyrics editor","es":"Abrir editor completo de acordes y letras"},
  clearSearchTooltip: {"pt":"Limpar busca","en":"Clear search","es":"Limpiar búsqueda"},
  filterByTagsTooltip: {"pt":"Filtrar por tags de estilo","en":"Filter by style tags","es":"Filtrar por etiquetas de estilo"},
  sortByArtistTooltip: {"pt":"Ordenar por Artista / Banda","en":"Sort by Artist / Band","es":"Ordenar por Artista / Banda"},
  sortBySongTooltip: {"pt":"Ordenar por Nome da Música","en":"Sort by Song Title","es":"Ordenar por Título de Canción"},
  songsCountSuffix: {"pt":"músicas","en":"songs","es":"canciones"},
  profileBandsTitle: {"pt":"Bandas e Projetos","en":"Bands & Projects","es":"Bandas y Proyectos"},
  profileNewBandBtn: {"pt":"Nova Banda","en":"New Band","es":"Nueva Banda"},
  createBandBtn: {"pt":"Criar Banda","en":"Create Band","es":"Crear Banda"},
  viewAgendaAndPanel: {"pt":"Ver Agenda & Painel","en":"View Schedule & Panel","es":"Ver Agenda y Panel"},
  generalGenre: {"pt":"Geral","en":"General","es":"General"},
  clickToOpenBandPage: {"pt":"Clique para abrir a página da banda","en":"Click to open band page","es":"Clic para abrir la página de la banda"},
  agendaTitle: {"pt":"Agenda","en":"Schedule","es":"Agenda"},
  agendaShareBtn: {"pt":"Compartilhar Agenda","en":"Share Schedule","es":"Compartir Agenda"},
  agendaNewEventBtn: {"pt":"Novo Evento","en":"New Event","es":"Nuevo Evento"},
  agendaYearLabel: {"pt":"Ano","en":"Year","es":"Año"},
  agendaEventsLabel: {"pt":"Eventos","en":"Events","es":"Eventos"},
  agendaShowsLabel: {"pt":"Shows","en":"Gigs","es":"Conciertos"},
  agendaRehearsalsLabel: {"pt":"Ensaios","en":"Rehearsals","es":"Ensayos"},
  agendaIncomeLabel: {"pt":"Entradas","en":"Income","es":"Ingresos"},
  agendaChangeYearTooltip: {"pt":"Clique para trocar o ano","en":"Click to change year","es":"Clic para cambiar de año"},
  agendaTotalEventsTooltip: {"pt":"Total de Eventos","en":"Total Events","es":"Total de Eventos"},
  agendaShowsTooltip: {"pt":"Shows","en":"Gigs","es":"Conciertos"},
  agendaRehearsalsTooltip: {"pt":"Ensaios","en":"Rehearsals","es":"Ensayos"},
  agendaIncomeTooltip: {"pt":"Total Recebido de Todas as Bandas no Ano","en":"Total Received from All Bands in the Year","es":"Total Recibido de Todas las Bandas en el Año"},
  noEventsScheduledInYear: {"pt":"Nenhum evento agendado em","en":"No events scheduled in","es":"Ningún evento programado en"},
  noEventsScheduledSubtitle: {"pt":"Registre shows e ensaios nas suas bandas para montar o cronograma unificado.","en":"Register gigs and rehearsals in your bands to build your unified schedule.","es":"Registra conciertos y ensayos en tus bandas para armar el cronograma unificado."},
  agendaAddEventBtn: {"pt":"Adicionar Evento","en":"Add Event","es":"Añadir Evento"},
  badgeSubstitute: {"pt":"SUBSTITUTO","en":"SUBSTITUTE","es":"SUPLENTE"},
  badgeRehearsal: {"pt":"ENSAIO","en":"REHEARSAL","es":"ENSAYO"},
  badgeShow: {"pt":"SHOW","en":"GIG","es":"CONCIERTO"},
  musicianShareValueTooltip: {"pt":"Valor da parte do músico:","en":"Musician share value:","es":"Parte correspondiente al músico:"},
  clickToToggleMonthTooltip: {"pt":"Clique para expandir/recolher mês","en":"Click to expand/collapse month","es":"Clic para expandir/colapsar mes"},
  bandTotalCacheTooltip: {"pt":"Cachê Total da Banda","en":"Total Band Fee","es":"Caché Total de la Banda"},
  loadPhotoBtn: {"pt":"Carregar Foto","en":"Upload Photo","es":"Subir Foto"},
  profilePhotoTitle: {"pt":"Foto de Perfil","en":"Profile Photo","es":"Foto de Perfil"},
  profilePhotoSubtitle: {"pt":"Carregue uma imagem do seu computador ou informe a URL.","en":"Upload an image from your computer or enter a direct URL.","es":"Sube una imagen de tu ordenador o introduce una URL directa."},
  adjustCropTitle: {"pt":"Ajustar e Recortar Foto","en":"Adjust & Crop Photo","es":"Ajustar y Recortar Foto"},
  dragToPositionPrompt: {"pt":"Arraste para posicionar","en":"Drag to reposition","es":"Arrastra para posicionar"},
  applyCropBtn: {"pt":"Aplicar Recorte","en":"Apply Crop","es":"Aplicar Recorte"},
  displayNameLabel: {"pt":"Nome de Exibição (Nome Completo / Artístico) *","en":"Display Name (Full / Stage Name) *","es":"Nombre para Mostrar (Nombre Completo / Artístico) *"},
  birthDateLabel: {"pt":"Data de Nascimento","en":"Date of Birth","es":"Fecha de Nacimiento"},
  birthDateNote: {"pt":"Sua idade será calculada automaticamente e exibida na pílula do cabeçalho.","en":"Your age will be automatically calculated and displayed in the header badge.","es":"Tu edad se calculará automáticamente y se mostrará en la insignia de la cabecera."},
  locationLabel: {"pt":"Localização (Formulário Aberto)","en":"Location","es":"Ubicación"},
  cityLabel: {"pt":"Cidade","en":"City","es":"Ciudad"},
  stateLabel: {"pt":"Estado (UF)","en":"State / Province","es":"Estado / Provincia"},
  countryLabel: {"pt":"País","en":"Country","es":"País"},
  profileOtherSectionsNote: {"pt":"Demais seções (Bio, Habilidades, Influências e Redes) são editadas diretamente nos botões verdes do perfil.","en":"Other sections (Bio, Skills, Influences, and Social Links) are edited directly via their green edit buttons on the profile.","es":"Las demás secciones (Bio, Habilidades, Influencias y Redes) se editan directamente en los botones verdes del perfil."},
  saveProfileBtn: {"pt":"Salvar Perfil","en":"Save Profile","es":"Guardar Perfil"},
  addSkillModalTitle: {"pt":"Habilidade Musical","en":"Musical Skill","es":"Habilidad Musical"},
  skillNameLabel: {"pt":"Instrumento / Habilidade *","en":"Instrument / Skill *","es":"Instrumento / Habilidad *"},
  skillMasteryLevelLabel: {"pt":"Nível de Domínio (Estrelas)","en":"Proficiency Level (Stars)","es":"Nivel de Dominio (Estrellas)"},
  addExtraSkillModalTitle: {"pt":"Habilidade Extra / Produção","en":"Extra / Production Skill","es":"Habilidad Extra / Producción"},
  selectExtraSkillLabel: {"pt":"Selecione a Habilidade","en":"Select Skill","es":"Selecciona la Habilidad"},
  chooseOptionFromList: {"pt":"-- Escolha uma opção da lista --","en":"-- Choose an option from the list --","es":"-- Elige una opción de la lista --"},
  customExtraSkillLabel: {"pt":"Ou digite uma opção personalizada:","en":"Or type a custom option:","es":"O escribe una opción personalizada:"},
  activeExtraSkillsLabel: {"pt":"Habilidades Cadastradas no Perfil","en":"Skills Registered in Profile","es":"Habilidades Registradas en el Perfil"},
  finishBtn: {"pt":"Concluir","en":"Done","es":"Finalizar"},

  profileTabSkillsShort: {"pt":"Habilidades","en":"Skills","es":"Habilidades"},
  profileTabGearShort: {"pt":"Equipamentos","en":"Gear","es":"Equipos"},
  songbookSidebarTitle: {"pt":"Músicas","en":"Songs","es":"Canciones"},
  syncWeb: {"pt":"Sincronizar com a Nuvem","en":"Sync with Cloud","es":"Sincronizar con la Nube"},
  profileTabBioShort: {"pt":"Bio","en":"Bio","es":"Bio"},
  profileTabProjectsShort: {"pt":"Projetos","en":"Projects","es":"Proyectos"},
  profileTabAgendaShort: {"pt":"Agenda","en":"Schedule","es":"Agenda"},
  profileTabSongbookShort: {"pt":"Songbook","en":"Songbook","es":"Songbook"},
  bioAboutMeTitle: {"pt":"Sobre Mim","en":"About Me","es":"Sobre Mí"},
  bioInterestsAvailabilityTitle: {"pt":"Nível de Interesse e Disponibilidade","en":"Interest Level & Availability","es":"Nivel de Interés y Disponibilidad"},
  bioMusicalInfluencesTitle: {"pt":"Influências Musicais","en":"Musical Influences","es":"Influencias Musicales"},
  bioPresentationLabel: {"pt":"Biografia & Apresentação:","en":"Biography & Intro:","es":"Biografía y Presentación:"},
  bioHobbie: {"pt":"Hobbie","en":"Hobby","es":"Pasatiempo"},
  bioProfessional: {"pt":"Profissional","en":"Professional","es":"Profesional"},
  bioCasual: {"pt":"Casual","en":"Casual","es":"Casual"},
  bioAvailable: {"pt":"Disponível","en":"Available","es":"Disponible"},
  songbookSortBy: {"pt":"Ordenar:","en":"Sort by:","es":"Ordenar por:"},
  songbookSortBand: {"pt":"Banda","en":"Band","es":"Banda"},
  songbookSortSong: {"pt":"Música","en":"Song","es":"Canción"},
  songbookBackToList: {"pt":"Voltar para Lista","en":"Back to List","es":"Volver a la Lista"},
  songbookAddSongBtn: {"pt":"Adicionar Nova Música","en":"Add New Song","es":"Añadir Nueva Canción"},
  songbookStatsBtn: {"pt":"Estatísticas","en":"Statistics","es":"Estadísticas"},
  songbookSongTitlePlaceholder: {"pt":"Nome da Música","en":"Song Title","es":"Título de la Canción"},
  songbookArtistPlaceholder: {"pt":"Artista / Banda Original","en":"Original Artist / Band","es":"Artista / Banda Original"},
  songbookKeyPrefix: {"pt":"Tom:","en":"Key:","es":"Tono:"},
  songbookBpmPrefix: {"pt":"BPM:","en":"BPM:","es":"BPM:"},
  songbookDurationPrefix: {"pt":"Duração:","en":"Duration:","es":"Duración:"},
  songbookEmptySubtitle: {"pt":"Adicione ou selecione uma música no menu lateral para visualizar e editar letras, cifras e tablaturas.","en":"Add or select a song in the sidebar to view and edit lyrics, chords, and tabs.","es":"Añade o selecciona una canción en la barra lateral para ver y editar letras, acordes y tablaturas."},
  songbookSearchBandPlaceholder: {"pt":"Buscar música ou artista...","en":"Search song or artist...","es":"Buscar canción o artista..."},
  songbookTransposeTitle: {"pt":"Transposição de Tom","en":"Key Transpose","es":"Transporte de Tono"},
  songbookAutoScrollTitle: {"pt":"Rolagem Automática","en":"Auto-Scroll","es":"Desplazamiento Automático"},
  songbookFontSizeTitle: {"pt":"Tamanho da Fonte","en":"Font Size","es":"Tamaño de Fuente"},
  songbookModeChords: {"pt":"Cifras","en":"Chords","es":"Acordes"},
  songbookModeLyrics: {"pt":"Letras","en":"Lyrics","es":"Letras"},
  songbookModeTabs: {"pt":"Tablaturas","en":"Tabs","es":"Tablaturas"},
  songbookModeDetails: {"pt":"Detalhes","en":"Details","es":"Detalles"},
  bandSincePrefix: {"pt":"DESDE","en":"SINCE","es":"DESDE"},
  bandEditProfileBtn: {"pt":"Editar Banda","en":"Edit Band","es":"Editar Banda"},
  bandOpenRepertoire: {"pt":"Ver Agenda & Painel","en":"View Schedule & Panel","es":"Ver Agenda y Panel"},
  socialOpportunitiesTitle: {"pt":"Oportunidades & Vagas","en":"Opportunities & Openings","es":"Oportunidades y Vacantes"},
  socialOpportunitiesSubtitle: {"pt":"Encontre vagas em bandas ou anuncie sua disponibilidade na rede","en":"Find band openings or announce your availability on the network","es":"Encuentra vacantes en bandas o anuncia tu disponibilidad en la red"},
  socialNewAnnouncementBtn: {"pt":"Novo Anúncio","en":"New Announcement","es":"Nuevo Anuncio"},
  socialClassifiedsTab: {"pt":"Classificados","en":"Classifieds","es":"Clasificados"},
  socialSearchInputPlaceholder: {"pt":"Buscar...","en":"Search...","es":"Buscar..."},
  socialMusiciansTab: {"pt":"Músicos","en":"Musicians","es":"Músicos"},
  socialAnnouncementsTab: {"pt":"Anúncios","en":"Announcements","es":"Anuncios"},
  socialBandsTab: {"pt":"Bandas","en":"Bands","es":"Bandas"},
  add: {"pt":"Adicionar","en":"Add","es":"Añadir"},
  remove: {"pt":"Remover","en":"Remove","es":"Eliminar"},
  openSongbookEditor: {"pt":"Abrir Editor Completo","en":"Open Full Editor","es":"Abrir Editor Completo"},
  loginToSyncSubtitle: {"pt":"Faça login para sincronizar seu perfil, songbook, bandas e agenda.","en":"Log in to sync your profile, songbook, bands, and schedule.","es":"Inicia sesión para sincronizar tu perfil, songbook, bandas y agenda."},
  authSignInNetwork: {"pt":"Entrar na Rede","en":"Sign In","es":"Iniciar Sesión"},
  noProjectsFound: {"pt":"Nenhum projeto encontrado","en":"No projects found","es":"No se encontraron proyectos"},
  noProjectsFoundSubtitle: {"pt":"Crie uma banda ou vincule-se para acompanhar repertório, shows e finanças.","en":"Create a band or join one to track repertoire, gigs, and finances.","es":"Crea una banda o únete a una para seguir repertorio, conciertos y finanzas."},
  noBandsLinked: {"pt":"Nenhuma banda vinculada","en":"No bands linked yet","es":"Sin bandas vinculadas aún"},
  createBandCloudSubtitle: {"pt":"Crie uma banda na nuvem para sincronizar com os integrantes.","en":"Create a band in the cloud to sync with members.","es":"Crea una banda en la nube para sincronizar con los integrantes."},
  noEventsScheduledYear: {"pt":"Nenhum evento agendado no ano selecionado","en":"No events scheduled for the selected year","es":"No hay eventos programados en el año seleccionado"},
  registerGigsPrompt: {"pt":"Registre shows e ensaios nas suas bandas para acompanhar sua agenda.","en":"Register gigs and rehearsals in your bands to track your tour schedule.","es":"Registra conciertos y ensayos en tus bandas para seguir tu agenda."},
  bandHomeTab: {"pt":"Home","en":"Home","es":"Inicio"},
  bandChangesTab: {"pt":"Home","en":"Home","es":"Inicio"},
  bandPostsTitle: {"pt":"Lembretes da Banda","en":"Band Reminders","es":"Recordatorios de la Banda"},
  newPostBtn: {"pt":"Novo Lembrete","en":"New Reminder","es":"Nuevo Recordatorio"},
  pinnedPost: {"pt":"Fixo no Topo","en":"Pinned to Top","es":"Fijado al Inicio"},
  bandMembersTab: {"pt":"Membros","en":"Members","es":"Miembros"},
  bandRepertoireTab: {"pt":"Repertório","en":"Repertoire","es":"Repertorio"},
  bandFinancesTab: {"pt":"Finanças","en":"Finances","es":"Finanzas"},
  bandAgendaTab: {"pt":"Agenda","en":"Schedule","es":"Agenda"},
  socialMusiciansTab: {"pt":"Músicos","en":"Musicians","es":"Músicos"},
  socialAnnouncementsTab: {"pt":"Anúncios","en":"Announcements","es":"Anuncios"},
  socialBandsTab: {"pt":"Bandas","en":"Bands","es":"Bandas"},
  chordsTab: {"pt":"Cifras","en":"Chords","es":"Acordes"},
  lyricsTab: {"pt":"Letras","en":"Lyrics","es":"Letras"},
  tabsTab: {"pt":"Tablaturas","en":"Tabs","es":"Tablaturas"},
  detailsTab: {"pt":"Detalhes","en":"Details","es":"Detalles"},

  // Navigation & Shell
  navProfile: { pt: 'PERFIL', en: 'PROFILE', es: 'PERFIL' },
  navSongbook: { pt: 'SONGBOOK', en: 'SONGBOOK', es: 'SONGBOOK' },
  navProjects: { pt: 'PROJETOS', en: 'PROJECTS', es: 'PROYECTOS' },
  navSocial: { pt: 'SOCIAL', en: 'NETWORK', es: 'RED' },
  navOptions: { pt: 'OPÇÕES', en: 'OPTIONS', es: 'OPCIONES' },
  sidebarHideMenu: { pt: 'Ocultar Menu Lateral', en: 'Hide Sidebar Menu', es: 'Ocultar Menú Lateral' },
  sidebarOpenMenu: { pt: 'Abrir Menu Lateral', en: 'Open Sidebar Menu', es: 'Abrir Menú Lateral' },
  sidebarCloseMenu: { pt: 'Fechar Menu', en: 'Close Menu', es: 'Cerrar Menú' },
  sidebarLogout: { pt: 'Sair da Conta (Logout)', en: 'Log Out of Account', es: 'Cerrar Sesión de la Cuenta' },
  sidebarMenuLabel: { pt: 'Menu', en: 'Menu', es: 'Menú' },
  sidebarNotLoggedIn: { pt: 'Não autenticado', en: 'Not signed in', es: 'No autenticado' },
  sidebarGuest: { pt: 'Visitante', en: 'Guest', es: 'Invitado' },

  // Options Page
  optionsTitle: { pt: 'Configurações & Opções', en: 'Settings & Options', es: 'Configuración y Opciones' },
  optionsSubtitle: { pt: 'Personalize suas preferências, idioma e conta no BandLink Web', en: 'Customize your preferences, language, and account on BandLink Web', es: 'Personaliza tus preferencias, idioma y cuenta en BandLink Web' },
  optionsLanguageTitle: { pt: 'Idioma da Plataforma', en: 'Platform Language', es: 'Idioma de la Plataforma' },
  optionsLanguageDesc: { pt: 'Selecione o idioma padrão para a interface, formulários, botões e mensagens do sistema.', en: 'Select the default language for the interface, forms, buttons, and notifications.', es: 'Selecciona el idioma predeterminado para la interfaz, formularios, botones y notificaciones.' },
  optionsLanguageActiveBadge: { pt: 'Idioma Ativo', en: 'Active Language', es: 'Idioma Activo' },
  optionsLangPtDesc: { pt: 'Português do Brasil • Configurações completas', en: 'Brazilian Portuguese • Full settings', es: 'Portugués de Brasil • Configuración completa' },
  optionsLangEnDesc: { pt: 'English (US) • Padrão internacional', en: 'English (US) • International default', es: 'English (US) • Por defecto internacional' },
  optionsLangEsDesc: { pt: 'Español • Interfaz y opciones', en: 'Spanish • Interface and options', es: 'Español • Interfaz y opciones' },
  optionsThemeTitle: { pt: 'Aparência & Tema', en: 'Appearance & Theme', es: 'Apariencia y Tema' },
  optionsThemeDesc: { pt: 'Interface otimizada para palco, estúdio e baixa luminosidade.', en: 'Interface optimized for stage, studio, and low-light environments.', es: 'Interfaz optimizada para escenario, estudio y entornos con poca luz.' },
  optionsThemeDark: { pt: 'Tema Escuro (Cyber Stage)', en: 'Dark Theme (Cyber Stage)', es: 'Tema Oscuro (Cyber Stage)' },
  optionsThemeActive: { pt: 'Ativo por Padrão', en: 'Active by Default', es: 'Activo por Defecto' },
  optionsAccountTitle: { pt: 'Conta & Sessão', en: 'Account & Session', es: 'Cuenta y Sesión' },
  optionsAccountDesc: { pt: 'Gerencie sua conta conectada e status de sincronização com o aplicativo.', en: 'Manage your connected account and synchronization status with the mobile app.', es: 'Gestiona tu cuenta conectada y el estado de sincronización con la aplicación móvil.' },
  optionsLoggedInAs: { pt: 'Conectado como:', en: 'Logged in as:', es: 'Conectado como:' },
  optionsLogoutBtn: { pt: 'Encerrar Sessão', en: 'Log Out', es: 'Cerrar Sesión' },
  optionsNotLoggedIn: { pt: 'Você não está logado no momento.', en: 'You are not currently logged in.', es: 'No has iniciado sesión actualmente.' },
  optionsLoginBtn: { pt: 'Fazer Login / Criar Conta', en: 'Log In / Register', es: 'Iniciar Sesión / Registrarse' },
  optionsAppTitle: { pt: 'Aplicativo Mobile', en: 'Mobile App', es: 'Aplicación Móvil' },
  optionsAppDesc: { pt: 'Sincronize seu repertório, setlists, letras e cifras com seu celular ou tablet no palco.', en: 'Sync your repertoire, setlists, lyrics, and chords with your phone or tablet on stage.', es: 'Sincroniza tu repertorio, setlists, letras y acordes con tu móvil o tableta en el escenario.' },
  optionsAppAndroid: { pt: 'Disponível para Android', en: 'Available for Android', es: 'Disponible para Android' },
  optionsAppDownloadBtn: { pt: 'Baixar App Android', en: 'Download Android App', es: 'Descargar App Android' },
  optionsAboutTitle: { pt: 'Sobre o BandLink', en: 'About BandLink', es: 'Acerca de BandLink' },
  optionsAboutVersion: { pt: 'Versão Web 2.5 • Plataforma & Rede Musical para Músicos', en: 'Web Version 2.5 • Music Platform & Social Network for Musicians', es: 'Versión Web 2.5 • Plataforma y Red Musical para Músicos' },
  optionsTerms: { pt: 'Termos de Uso', en: 'Terms of Use', es: 'Términos de Uso' },
  optionsPrivacy: { pt: 'Privacidade', en: 'Privacy Policy', es: 'Política de Privacidad' },

  // General Loading & Statuses
  loadingMsg: { pt: 'Carregando...', en: 'Loading...', es: 'Cargando...' },
  optionsLoading: { pt: 'Opções & Configurações...', en: 'Options & Settings...', es: 'Opciones y Configuración...' },
  songbookLoading: { pt: 'Songbook & Cifras...', en: 'Songbook & Chords...', es: 'Songbook y Acordes...' },
  projectsLoading: { pt: 'Projetos & Bandas...', en: 'Projects & Bands...', es: 'Proyectos y Bandas...' },
  bandProfileLoading: { pt: 'Página da Banda...', en: 'Band Page...', es: 'Página de la Banda...' },
  socialLoading: { pt: 'Rede & Comunidade...', en: 'Network & Community...', es: 'Red y Comunidad...' },
  profileLoading: { pt: 'Perfil do Músico...', en: 'Musician Profile...', es: 'Perfil del Músico...' },
  availableStatus: { pt: 'Disponível', en: 'Available', es: 'Disponible' },
  busyStatus: { pt: 'Ocupado', en: 'Busy', es: 'Ocupado' },
  touringStatus: { pt: 'Em Turnê', en: 'On Tour', es: 'De Gira' },
  studioStatus: { pt: 'Em Estúdio', en: 'In Studio', es: 'En Estudio' },
  languageChangedToast: {
    pt: 'Idioma alterado para Português!',
    en: 'Language changed to English!',
    es: '¡Idioma cambiado a Español!'
  },

  // Profile View
  profileDisplayNamePlaceholder: { pt: 'NOME DE EXIBIÇÃO', en: 'DISPLAY NAME', es: 'NOMBRE DE VISUALIZACIÓN' },
  profileTabBio: { pt: 'Bio & Info', en: 'Bio & Info', es: 'Bio e Info' },
  profileTabBioShort: { pt: 'Bio', en: 'Bio', es: 'Bio' },
  profileTabSkills: { pt: 'Habilidades', en: 'Skills', es: 'Habilidades' },
  profileTabGear: { pt: 'Equipamentos', en: 'Gear & Setup', es: 'Equipamiento' },
  profileTabBands: { pt: 'Bandas & Projetos', en: 'Bands & Projects', es: 'Bandas y Proyectos' },
  profileTabProjectsShort: { pt: 'Projetos', en: 'Projects', es: 'Proyectos' },
  profileTabAgenda: { pt: 'Agenda de Shows', en: 'Tour & Gigs', es: 'Agenda y Conciertos' },
  profileTabAgendaShort: { pt: 'Agenda', en: 'Agenda', es: 'Agenda' },
  editProfileBtn: { pt: 'Editar Perfil', en: 'Edit Profile', es: 'Editar Perfil' },
  shareProfileBtn: { pt: 'Compartilhar Perfil', en: 'Share Profile', es: 'Compartir Perfil' },
  bioAboutMeTitle: { pt: 'Sobre mim', en: 'About me', es: 'Sobre mí' },
  bioEmptyAboutText: { pt: 'Adicione uma biografia contando sobre sua trajetória musical, experiências em bandas e projetos.', en: 'Add a bio telling about your musical journey, band experiences, and projects.', es: 'Añade una biografía sobre tu trayectoria musical, experiencia en bandas y proyectos.' },
  bioInterestsAvailabilityTitle: { pt: 'Nível de Interesse & Disponibilidade', en: 'Interest Level & Availability', es: 'Nivel de Interés y Disponibilidad' },
  bioMusicalInfluencesTitle: { pt: 'Influências Musicais', en: 'Musical Influences', es: 'Influencias Musicales' },
  bioEmptyInfluencesText: { pt: 'Nenhuma influência cadastrada. Adicione seus artistas e bandas favoritas.', en: 'No influences listed. Add your favorite artists and bands.', es: 'Sin influencias registradas. Añade tus artistas y bandas favoritos.' },
  bioAddInfluencePlaceholder: { pt: 'Adicionar influência (ex: Pink Floyd)...', en: 'Add influence (e.g. Pink Floyd)...', es: 'Añadir influencia (ej: Pink Floyd)...' },
  skillsMusicalTitle: { pt: 'Musicais', en: 'Musical Skills', es: 'Habilidades Musicales' },
  skillsExtraTitle: { pt: 'Extras', en: 'Extra Skills', es: 'Habilidades Extras' },
  skillsGearTitle: { pt: 'Equipamentos', en: 'Gear & Equipment', es: 'Equipamiento' },
  skillsAddBtn: { pt: 'Adicionar Habilidade', en: 'Add Skill', es: 'Añadir Habilidad' },
  skillsAddExtraBtn: { pt: 'Adicionar Extra', en: 'Add Extra Skill', es: 'Añadir Habilidad Extra' },
  skillsAddGearBtn: { pt: 'Adicionar Equipamento', en: 'Add Gear', es: 'Añadir Equipamiento' },
  profileProjectsTitle: { pt: 'Bandas e Projetos', en: 'Bands and Projects', es: 'Bandas y Proyectos' },
  profileProjectsNewBtn: { pt: 'Nova Banda', en: 'New Band', es: 'Nueva Banda' },
  profileAgendaTitle: { pt: 'Agenda de Shows & Ensaios', en: 'Gigs & Rehearsals Schedule', es: 'Agenda de Conciertos y Ensayos' },
  profileAgendaNewEventBtn: { pt: 'Novo Evento', en: 'New Event', es: 'Nuevo Evento' },
  profileNoAgendaText: { pt: 'Nenhum show ou ensaio agendado no momento.', en: 'No gigs or rehearsals scheduled at the moment.', es: 'No hay conciertos ni ensayos programados en este momento.' },
  profileNoBandsText: { pt: 'Você ainda não faz parte de nenhuma banda ou projeto.', en: 'You are not part of any band or project yet.', es: 'Aún no formas parte de ninguna banda o proyecto.' },
  profileNoSkillsText: { pt: 'Nenhuma habilidade cadastrada.', en: 'No skills registered yet.', es: 'Sin habilidades registradas.' },
  profileNoGearText: { pt: 'Nenhum equipamento registrado.', en: 'No gear registered yet.', es: 'Sin equipamiento registrado.' },

  // Songbook View
  songbookPageTitle: { pt: 'SONGBOOK', en: 'SONGBOOK', es: 'SONGBOOK' },
  songbookNewSongBtn: { pt: 'Nova Música', en: 'New Song', es: 'Nueva Canción' },
  songbookImportBtn: { pt: 'Importar Lote', en: 'Batch Import', es: 'Importar Lote' },
  songbookSearchPlaceholder: { pt: 'Buscar música ou artista no repertório...', en: 'Search song or artist in repertoire...', es: 'Buscar canción o artista en el repertorio...' },
  songbookSortAZ: { pt: 'A-Z', en: 'A-Z', es: 'A-Z' },
  songbookSortZA: { pt: 'Z-A', en: 'Z-A', es: 'Z-A' },
  songbookSortArtist: { pt: 'Artista', en: 'Artist', es: 'Artista' },
  songbookSortRecent: { pt: 'Recentes', en: 'Recent', es: 'Recientes' },
  songbookEmptySelect: { pt: 'Nenhuma música selecionada', en: 'No song selected', es: 'Ninguna canción seleccionada' },
  songbookEmptySelectHint: { pt: 'Selecione uma música na lista ao lado para visualizar a cifra, letra ou detalhes.', en: 'Select a song from the list on the left to view chords, lyrics, or details.', es: 'Selecciona una canción de la lista a la izquierda para ver acordes, letra o detalles.' },
  songbookExportWord: { pt: 'Exportar Word', en: 'Export Word', es: 'Exportar Word' },
  songbookExportPdf: { pt: 'PDF', en: 'PDF', es: 'PDF' },
  songbookAutoScroll: { pt: 'Rolagem', en: 'Auto Scroll', es: 'Desplazamiento' },
  songbookTranspose: { pt: 'Tom Original', en: 'Original Key', es: 'Tono Original' },
  songbookToneUp: { pt: '+1 Semitom', en: '+1 Semitone', es: '+1 Semitono' },
  songbookToneDown: { pt: '-1 Semitom', en: '-1 Semitone', es: '-1 Semitono' },
  songbookToneReset: { pt: 'Restaurar Tom', en: 'Reset Key', es: 'Restablecer Tono' },
  songbookTabChords: { pt: 'Cifra & Letra', en: 'Chords & Lyrics', es: 'Acordes y Letra' },
  songbookTabTabs: { pt: 'Tablatura', en: 'Tablature', es: 'Tablatura' },
  songbookTabDetails: { pt: 'Detalhes', en: 'Details', es: 'Detalles' },
  songbookEditSongBtn: { pt: 'Editar Música', en: 'Edit Song', es: 'Editar Canción' },
  songbookDeleteSongBtn: { pt: 'Excluir Música', en: 'Delete Song', es: 'Eliminar Canción' },
  songbookBpmLabel: { pt: 'BPM', en: 'BPM', es: 'BPM' },
  songbookDurationLabel: { pt: 'Duração', en: 'Duration', es: 'Duración' },
  songbookToneLabel: { pt: 'Tom', en: 'Key', es: 'Tono' },
  songbookStyleLabel: { pt: 'Gênero / Estilo', en: 'Genre / Style', es: 'Género / Estilo' },
  songbookNoSongsFound: { pt: 'Nenhuma música encontrada no seu repertório.', en: 'No songs found in your repertoire.', es: 'No se encontraron canciones en tu repertorio.' },

  // Projects View
  projectsPageTitle: { pt: 'PROJETOS & BANDAS', en: 'PROJECTS & BANDS', es: 'PROYECTOS Y BANDAS' },
  projectsPageSubtitle: { pt: 'Gerencie suas formações, repertório conjunto, agenda de shows e finanças', en: 'Manage your lineups, band repertoire, gig schedule, and finances', es: 'Gestiona tus formaciones, repertorio grupal, agenda de conciertos y finanzas' },
  projectsNewBandBtn: { pt: 'Nova Banda', en: 'New Band', es: 'Nueva Banda' },
  projectsTotalBandsBadge: { pt: 'Total de Bandas e Projetos', en: 'Total Bands & Projects', es: 'Total de Bandas y Proyectos' },
  projectsNoBandsYet: { pt: 'Nenhuma banda cadastrada ainda.', en: 'No bands registered yet.', es: 'Sin bandas registradas aún.' },
  projectsCreateFirstBandBtn: { pt: 'Criar Minha Primeira Banda', en: 'Create My First Band', es: 'Crear Mi Primera Banda' },
  projectsMembersCount: { pt: 'integrantes', en: 'members', es: 'integrantes' },
  projectsSongsCount: { pt: 'músicas', en: 'songs', es: 'canciones' },
  projectsEventsCount: { pt: 'shows', en: 'gigs', es: 'conciertos' },
  projectsOpenBandBtn: { pt: 'Abrir Painel da Banda', en: 'Open Band Dashboard', es: 'Abrir Panel de la Banda' },
  projectsSyncToCloudPrompt: { pt: 'Deseja sincronizar esta banda para a nuvem?', en: 'Would you like to sync this band to the cloud?', es: '¿Deseas sincronizar esta banda con la nube?' },
  projectsSyncOnlineBadge: { pt: 'Sincronizado na Nuvem', en: 'Synced to Cloud', es: 'Sincronizado en la Nube' },
  projectsSyncOfflineBadge: { pt: 'Salvo Localmente (Offline)', en: 'Saved Locally (Offline)', es: 'Guardado Localmente (Offline)' },

  // Songbook Editor Sync & Status
  unsavedChangesAuto: { pt: 'Alterações não salvas (salvamento automático em breve...)', en: 'Unsaved changes (auto-saving shortly...)', es: 'Cambios no guardados (guardado automático en breve...)' },
  songNameRequired: { pt: 'O nome da música é obrigatório.', en: 'Song title is required.', es: 'El título de la canción es obligatorio.' },
  songDetailsUpdated: { pt: 'Detalhes da música atualizados!', en: 'Song details updated!', es: '¡Detalles de la canción actualizados!' },
  songSavedAndSynced: { pt: 'Música salva e sincronizada na nuvem!', en: 'Song saved and synced to the cloud!', es: '¡Canción guardada y sincronizada en la nube!' },
  savingToCloud: { pt: 'Salvando na nuvem...', en: 'Saving to cloud...', es: 'Guardando en la nube...' },
  autoSavedCloud: { pt: 'Salvo automaticamente na nuvem', en: 'Auto-saved to cloud', es: 'Guardado automáticamente en la nube' },
  syncedToCloud: { pt: 'Sincronizado na nuvem (Supabase)', en: 'Synced to cloud (Supabase)', es: 'Sincronizado en la nube (Supabase)' },
  savedLocally: { pt: 'Salvo localmente', en: 'Saved locally', es: 'Guardado localmente' },
  savedLocalCache: { pt: 'Salvo em cache local.', en: 'Saved to local cache.', es: 'Guardado en caché local.' },
  savedLocallyOffline: { pt: 'Salvo localmente (offline)', en: 'Saved locally (offline)', es: 'Guardado localmente (offline)' },
  savedOfflineBrowser: { pt: 'Salvo offline no navegador.', en: 'Saved offline in browser.', es: 'Guardado offline en el navegador.' },
  songSavedSuccess: { pt: 'Música salva com sucesso!', en: 'Song saved successfully!', es: '¡Canción guardada con éxito!' },

  // Band Profile View
  bandTabTimeline: { pt: 'Linha do Tempo', en: 'Timeline', es: 'Línea de Tiempo' },
  bandTabMembers: { pt: 'Integrantes', en: 'Members', es: 'Integrantes' },
  bandTabRepertoire: { pt: 'Repertório', en: 'Repertoire', es: 'Repertorio' },
  bandTabFinances: { pt: 'Finanças', en: 'Finances', es: 'Finanzas' },
  bandTabAgenda: { pt: 'Agenda', en: 'Schedule', es: 'Agenda' },
  bandEditBtn: { pt: 'Editar Banda', en: 'Edit Band', es: 'Editar Banda' },
  bandShareBtn: { pt: 'Compartilhar', en: 'Share', es: 'Compartir' },
  bandAddMemberBtn: { pt: 'Adicionar Integrante', en: 'Add Member', es: 'Añadir Integrante' },
  bandAddSongBtn: { pt: 'Adicionar Música', en: 'Add Song', es: 'Añadir Canción' },
  bandLinkSongbookBtn: { pt: 'Vincular do Songbook', en: 'Link from Songbook', es: 'Vincular de Songbook' },
  bandNewFinanceEntryBtn: { pt: 'Nova Movimentação', en: 'New Transaction', es: 'Nuevo Movimiento' },
  bandAdjustCashBtn: { pt: 'Ajustar Caixa', en: 'Adjust Band Cash', es: 'Ajustar Caja' },
  bandSplitCachetBtn: { pt: 'Dividir Cachê', en: 'Split Cachet', es: 'Dividir Caché' },
  bandNewEventBtn: { pt: 'Novo Show / Ensaio', en: 'New Gig / Rehearsal', es: 'Nuevo Concierto / Ensayo' },
  bandTotalCachetLabel: { pt: 'Cachê Total Bruto', en: 'Total Gross Cachet', es: 'Caché Total Bruto' },
  bandTotalCashLabel: { pt: 'Saldo em Caixa da Banda', en: 'Band Cash Balance', es: 'Saldo en Caja de la Banda' },
  bandNoMembersText: { pt: 'Nenhum integrante cadastrado nesta banda ainda.', en: 'No members registered in this band yet.', es: 'Sin integrantes registrados en esta banda aún.' },
  bandNoRepertoireText: { pt: 'Repertório vazio. Adicione ou importe músicas do seu songbook.', en: 'Repertoire is empty. Add or import songs from your songbook.', es: 'Repertorio vacío. Añade o importa canciones de tu songbook.' },
  bandNoFinancesText: { pt: 'Nenhuma movimentação financeira registrada.', en: 'No financial transactions recorded.', es: 'Sin movimientos financieros registrados.' },
  bandNoEventsText: { pt: 'Nenhum show ou ensaio na agenda desta banda.', en: 'No gigs or rehearsals scheduled for this band.', es: 'Sin conciertos ni ensayos en la agenda de esta banda.' },

  // Social / Network View
  socialHeroTitle: { pt: 'REDE MUSICAL', en: 'MUSICAL NETWORK', es: 'RED MUSICAL' },
  socialHeroSubtitle: { pt: 'Conecte-se com músicos, bandas e oportunidades da sua cena musical', en: 'Connect with musicians, bands, and opportunities in your music scene', es: 'Conéctate con músicos, bandas y oportunidades de tu escena musical' },
  socialTabMusicians: { pt: 'Músicos', en: 'Musicians', es: 'Músicos' },
  socialTabAnnouncements: { pt: 'Anúncios', en: 'Announcements', es: 'Anuncios' },
  socialTabBands: { pt: 'Bandas', en: 'Bands', es: 'Bandas' },
  socialSearchPlaceholder: { pt: 'Buscar por nome, instrumento, gênero ou cidade...', en: 'Search by name, instrument, genre, or city...', es: 'Buscar por nombre, instrumento, género o ciudad...' },
  socialSearchBtn: { pt: 'Buscar', en: 'Search', es: 'Buscar' },
  socialNewAnnBtn: { pt: 'Novo Anúncio', en: 'New Announcement', es: 'Nuevo Anuncio' },
  socialAnnTitle: { pt: 'Oportunidades & Vagas', en: 'Opportunities & Auditions', es: 'Oportunidades y Convocatorias' },
  socialAnnDesc: { pt: 'Encontre vagas em bandas ou anuncie sua disponibilidade na rede', en: 'Find openings in bands or post your availability to the network', es: 'Encuentra vacantes en bandas o publica tu disponibilidad en la red' },
  socialMusiciansSubtitle: { pt: 'Músicos disponíveis para projetos, gravações e palcos', en: 'Musicians available for projects, studio sessions, and gigs', es: 'Músicos disponibles para proyectos, grabaciones y escenarios' },
  socialBandsSubtitle: { pt: 'Bandas e projetos ativos procurando novas parcerias e shows', en: 'Active bands and projects looking for partnerships and gigs', es: 'Bandas y proyectos activos en busca de colaboraciones y actuaciones' },
  socialNoMusiciansFound: { pt: 'Nenhum músico encontrado com os filtros aplicados.', en: 'No musicians found with the applied filters.', es: 'No se encontraron músicos con los filtros aplicados.' },
  socialNoAnnouncementsFound: { pt: 'Nenhum anúncio ou oportunidade encontrado no momento.', en: 'No announcements or opportunities found at the moment.', es: 'No se encontraron anuncios ni oportunidades en este momento.' },
  socialNoBandsFound: { pt: 'Nenhuma banda encontrada com os filtros aplicados.', en: 'No bands found with the applied filters.', es: 'No se encontraron bandas con los filtros aplicados.' },
  filterCityPlaceholder: { pt: 'Cidade', en: 'City', es: 'Ciudad' },
  filterStatePlaceholder: { pt: 'UF / Estado', en: 'State / Province', es: 'Estado / Provincia' },
  filterCountryPlaceholder: { pt: 'País', en: 'Country', es: 'País' },

  // Auth Modal
  authModalTitle: { pt: 'Acesso BandLink', en: 'BandLink Access', es: 'Acceso BandLink' },
  authTabLogin: { pt: 'Entrar', en: 'Sign In', es: 'Iniciar Sesión' },
  authTabRegister: { pt: 'Criar Conta', en: 'Sign Up', es: 'Crear Cuenta' },
  authTabForgot: { pt: 'Recuperar Senha', en: 'Forgot Password', es: 'Recuperar Contraseña' },
  authEmailLabel: { pt: 'E-mail', en: 'Email', es: 'Correo Electrónico' },
  authEmailPlaceholder: { pt: 'seu-email@dominio.com', en: 'your-email@domain.com', es: 'tu-email@dominio.com' },
  authPasswordLabel: { pt: 'Senha', en: 'Password', es: 'Contraseña' },
  authPasswordPlaceholder: { pt: '••••••••', en: '••••••••', es: '••••••••' },
  authConfirmPasswordLabel: { pt: 'Confirmar Senha', en: 'Confirm Password', es: 'Confirmar Contraseña' },
  authUsernameLabel: { pt: 'Nome de Usuário (@)', en: 'Username (@)', es: 'Nombre de Usuario (@)' },
  authUsernamePlaceholder: { pt: 'ex: lucas_rock', en: 'e.g. lucas_rock', es: 'ej: lucas_rock' },
  authSubmitLoginBtn: { pt: 'Entrar no BandLink', en: 'Sign In to BandLink', es: 'Entrar a BandLink' },
  authSubmitRegisterBtn: { pt: 'Criar Minha Conta', en: 'Create My Account', es: 'Crear Mi Cuenta' },
  authSubmitForgotBtn: { pt: 'Enviar Código de Recuperação', en: 'Send Recovery Code', es: 'Enviar Código de Recuperación' },
  authResetPasswordBtn: { pt: 'Redefinir Minha Senha', en: 'Reset My Password', es: 'Restablecer Mi Contraseña' },
  authForgotLink: { pt: 'Esqueci minha senha', en: 'Forgot my password', es: 'Olvidé mi contraseña' },
  authBackToLoginLink: { pt: 'Voltar ao Login', en: 'Back to Sign In', es: 'Volver a Iniciar Sesión' },
  authRecoveryCodeLabel: { pt: 'Código de Recuperação (6 dígitos)', en: 'Recovery Code (6 digits)', es: 'Código de Recuperación (6 dígitos)' },
  authNewPasswordLabel: { pt: 'Nova Senha', en: 'New Password', es: 'Nueva Contraseña' },

  // Edit Profile Modal
  editProfileModalTitle: { pt: 'Editar Perfil & Foto', en: 'Edit Profile & Photo', es: 'Editar Perfil y Foto' },
  editProfilePhotoLabel: { pt: 'Foto de Perfil', en: 'Profile Picture', es: 'Foto de Perfil' },
  editProfilePhotoUploadBtn: { pt: 'Carregar Arquivo', en: 'Upload File', es: 'Subir Archivo' },
  editProfilePhotoCropBtn: { pt: 'Ajustar Corte', en: 'Adjust Crop', es: 'Ajustar Corte' },
  editProfilePhotoUrlPlaceholder: { pt: 'URL da foto ou envie um arquivo', en: 'Photo URL or upload a file', es: 'URL de la foto o sube un archivo' },
  editProfileNameLabel: { pt: 'Nome de Exibição', en: 'Display Name', es: 'Nombre de Visualización' },
  editProfileNamePlaceholder: { pt: 'Ex: Allison Rodrigues', en: 'e.g. Allison Rodrigues', es: 'Ej: Allison Rodrigues' },
  editProfileUsernameLabel: { pt: 'Identificador / @Username', en: 'Handle / @Username', es: 'Identificador / @Username' },
  editProfileBioLabel: { pt: 'Biografia / Sobre você', en: 'Bio / About You', es: 'Biografía / Sobre ti' },
  editProfileBioPlaceholder: { pt: 'Conte um pouco sobre sua trajetória, estilo e influências...', en: 'Tell a bit about your musical journey, styles, and influences...', es: 'Cuéntanos un poco sobre tu trayectoria, estilos e influencias...' },
  editProfileCityLabel: { pt: 'Cidade', en: 'City', es: 'Ciudad' },
  editProfileCityPlaceholder: { pt: 'Ex: Curitiba', en: 'e.g. Curitiba', es: 'Ej: Curitiba' },
  editProfileStateLabel: { pt: 'UF / Estado', en: 'State / Province', es: 'Estado / Provincia' },
  editProfileStatePlaceholder: { pt: 'Ex: PR', en: 'e.g. PR', es: 'Ej: PR' },
  editProfileCountryLabel: { pt: 'País', en: 'Country', es: 'País' },
  editProfileCountryPlaceholder: { pt: 'Ex: Brasil', en: 'e.g. Brazil', es: 'Ej: Brasil' },
  editProfileSocialsTitle: { pt: 'Redes Sociais & Links', en: 'Social Media & Links', es: 'Redes Sociales y Enlaces' },
  editProfileSaveBtn: { pt: 'Salvar Perfil', en: 'Save Profile', es: 'Guardar Perfil' },
  editProfileCancelBtn: { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },

  // Add / Edit Skills Modal
  addSkillModalTitle: { pt: 'Habilidade Musical', en: 'Musical Skill', es: 'Habilidad Musical' },
  addSkillNameLabel: { pt: 'Instrumento / Função Musical', en: 'Instrument / Musical Role', es: 'Instrumento / Rol Musical' },
  addSkillNamePlaceholder: { pt: 'Ex: Guitarra, Vocal, Bateria, Baixo, Teclado', en: 'e.g. Guitar, Vocals, Drums, Bass, Keyboard', es: 'Ej: Guitarra, Voz, Batería, Bajo, Teclado' },
  addSkillLevelLabel: { pt: 'Nível de Domínio', en: 'Proficiency Level', es: 'Nivel de Dominio' },
  addSkillExpLabel: { pt: 'Tempo de Prática / Experiência', en: 'Practice Time / Experience', es: 'Tiempo de Práctica / Experiencia' },
  addSkillSaveBtn: { pt: 'Salvar Habilidade', en: 'Save Skill', es: 'Guardar Habilidad' },
  addExtraSkillModalTitle: { pt: 'Habilidade Extra / Produção', en: 'Extra / Production Skill', es: 'Habilidad Extra / Producción' },
  addExtraSkillNameLabel: { pt: 'Habilidade Técnica ou de Produção', en: 'Technical or Production Skill', es: 'Habilidad Técnica o de Producción' },
  addExtraSkillNamePlaceholder: { pt: 'Ex: Direção de Palco, Gravação em DAW...', en: 'e.g. Stage Direction, DAW Recording, Mixing...', es: 'Ej: Dirección de Escenario, Grabación en DAW...' },

  // Add / Edit Gear Modal
  gearModalTitle: { pt: 'Equipamento Musical', en: 'Musical Gear', es: 'Equipamiento Musical' },
  gearNameLabel: { pt: 'Nome / Modelo do Equipamento', en: 'Gear Name / Model', es: 'Nombre / Modelo del Equipo' },
  gearNamePlaceholder: { pt: 'Ex: Fender Stratocaster Player Plus', en: 'e.g. Fender Stratocaster Player Plus', es: 'Ej: Fender Stratocaster Player Plus' },
  gearCategoryLabel: { pt: 'Categoria', en: 'Category', es: 'Categoría' },
  gearBrandLabel: { pt: 'Marca / Fabricante', en: 'Brand / Manufacturer', es: 'Marca / Fabricante' },
  gearNotesLabel: { pt: 'Observações / Especificações', en: 'Notes / Specifications', es: 'Notas / Especificaciones' },
  gearSaveBtn: { pt: 'Salvar Equipamento', en: 'Save Gear', es: 'Guardar Equipamiento' },
  gearDeleteBtn: { pt: 'Excluir', en: 'Delete', es: 'Eliminar' },

  // Add / Edit Song Modal
  addSongModalTitle: { pt: 'Adicionar Nova Música', en: 'Add New Song', es: 'Añadir Nueva Canción' },
  songTitleLabel: { pt: 'Título da Música', en: 'Song Title', es: 'Título de la Canción' },
  songTitlePlaceholder: { pt: 'Ex: Its My Life', en: 'e.g. Its My Life', es: 'Ej: Its My Life' },
  songArtistLabel: { pt: 'Banda / Artista Original', en: 'Original Artist / Band', es: 'Banda / Artista Original' },
  songArtistPlaceholder: { pt: 'Ex: Bon Jovi', en: 'e.g. Bon Jovi', es: 'Ej: Bon Jovi' },
  songToneLabel: { pt: 'Tom Original', en: 'Original Key', es: 'Tono Original' },
  songBpmLabel: { pt: 'BPM', en: 'BPM', es: 'BPM' },
  songDurationLabel: { pt: 'Duração (mm:ss)', en: 'Duration (mm:ss)', es: 'Duración (mm:ss)' },
  songDurationPlaceholder: { pt: 'Ex: 4:15', en: 'e.g. 4:15', es: 'Ej: 4:15' },
  songStyleLabel: { pt: 'Gênero / Estilos (separados por vírgula)', en: 'Genre / Styles (comma-separated)', es: 'Género / Estilos (separados por comas)' },
  songStylePlaceholder: { pt: 'Ex: Rock, Hard Rock, Pop Rock', en: 'e.g. Rock, Hard Rock, Pop Rock', es: 'Ej: Rock, Hard Rock, Pop Rock' },
  songLyricsChordsLabel: { pt: 'Letra com Cifras', en: 'Lyrics with Chords', es: 'Letra con Acordes' },
  songTabsLabel: { pt: 'Tablaturas / Riffs', en: 'Tabs / Riffs', es: 'Tablaturas / Riffs' },
  songSaveBtn: { pt: 'Salvar Música', en: 'Save Song', es: 'Guardar Canción' },

  // Create Band Modal
  createBandModalTitle: { pt: 'Criar Nova Banda / Projeto', en: 'Create New Band / Project', es: 'Crear Nueva Banda / Proyecto' },
  bandNameLabel: { pt: 'Nome da Banda', en: 'Band Name', es: 'Nombre de la Banda' },
  bandNamePlaceholder: { pt: 'Ex: Os Valentes', en: 'e.g. The Brave Ones', es: 'Ej: Los Valientes' },
  bandUsernameLabel: { pt: 'Identificador (@username único na rede)', en: 'Handle (@unique username on network)', es: 'Identificador (@username único en la red)' },
  bandUsernamePlaceholder: { pt: 'ex: os_valentes', en: 'e.g. the_brave_ones', es: 'ej: los_valientes' },
  bandGenreLabel: { pt: 'Gênero Musical Principal', en: 'Main Musical Genre', es: 'Género Musical Principal' },
  bandGenrePlaceholder: { pt: 'Ex: Classic Rock, Pop Rock', en: 'e.g. Classic Rock, Pop Rock', es: 'Ej: Classic Rock, Pop Rock' },
  bandDescriptionLabel: { pt: 'Descrição / Bio da Banda', en: 'Band Bio / Description', es: 'Descripción / Biografía de la Banda' },
  bandSubmitCreateBtn: { pt: 'Criar Banda', en: 'Create Band', es: 'Crear Banda' },

  // Add Event Modal
  addEventModalTitle: { pt: 'Novo Evento / Show / Ensaio', en: 'New Gig / Rehearsal / Event', es: 'Nuevo Evento / Concierto / Ensayo' },
  eventTitleLabel: { pt: 'Título do Evento', en: 'Event Title', es: 'Título del Evento' },
  eventTitlePlaceholder: { pt: 'Ex: Show no Bar do Rock', en: 'e.g. Gig at Rock Pub', es: 'Ej: Concierto en el Pub de Rock' },
  eventTypeLabel: { pt: 'Tipo de Evento', en: 'Event Type', es: 'Tipo de Evento' },
  eventTypeShow: { pt: 'Show / Apresentação', en: 'Gig / Live Show', es: 'Concierto / En Vivo' },
  eventTypeEnsaio: { pt: 'Ensaio', en: 'Rehearsal', es: 'Ensayo' },
  eventTypeGravacao: { pt: 'Gravação / Estúdio', en: 'Recording / Studio', es: 'Grabación / Estudio' },
  eventTypeOutro: { pt: 'Outro', en: 'Other', es: 'Otro' },
  eventDateLabel: { pt: 'Data do Evento', en: 'Event Date', es: 'Fecha del Evento' },
  eventTimeLabel: { pt: 'Horário de Início', en: 'Start Time', es: 'Hora de Inicio' },
  eventVenueLabel: { pt: 'Local / Endereço', en: 'Venue / Address', es: 'Lugar / Dirección' },
  eventVenuePlaceholder: { pt: 'Ex: Audio Club, São Paulo', en: 'e.g. Audio Club, Downtown', es: 'Ej: Audio Club, Madrid' },
  eventCachetLabel: { pt: 'Cachê Total (R$)', en: 'Total Cachet ($)', es: 'Caché Total ($)' },
  eventNotesLabel: { pt: 'Observações / Instruções para a Banda', en: 'Notes / Instructions for the Band', es: 'Notas / Instrucciones para la Banda' },
  eventSaveBtn: { pt: 'Salvar Evento', en: 'Save Event', es: 'Guardar Evento' },
  eventDeleteBtn: { pt: 'Excluir Evento', en: 'Delete Event', es: 'Eliminar Evento' },

  // Create Announcement Modal
  createAnnModalTitle: { pt: 'Criar Anúncio / Vaga', en: 'Create Announcement / Audition', es: 'Crear Anuncio / Convocatoria' },
  annTitleLabel: { pt: 'Título do Anúncio', en: 'Announcement Title', es: 'Título del Anuncio' },
  annTitlePlaceholder: { pt: 'Ex: Procuramos Baixista para banda de Indie Rock', en: 'e.g. Looking for Bassist for Indie Rock band', es: 'Ej: Buscamos Bajista para banda de Indie Rock' },
  annRolesLabel: { pt: 'Instrumentos / Funções Procuradas', en: 'Instruments / Roles Sought', es: 'Instrumentos / Roles Buscados' },
  annRolesPlaceholder: { pt: 'Ex: Guitarrista, Baixista, Vocalista', en: 'e.g. Guitarist, Bassist, Vocalist', es: 'Ej: Guitarrista, Bajista, Vocalista' },
  annDescLabel: { pt: 'Descrição Detalhada da Oportunidade', en: 'Detailed Description of Opportunity', es: 'Descripción Detallada de la Oportunidad' },
  annPublishBtn: { pt: 'Publicar Anúncio', en: 'Publish Announcement', es: 'Publicar Anuncio' },

  // Cache Split Modal
  cacheSplitModalTitle: { pt: 'Divisão de Cachê & Substitutos', en: 'Cachet Split & Substitutes', es: 'División de Caché y Sustitutos' },
  cacheSplitSubtitle: { pt: 'Ajuste os repasses aos integrantes e retenção de caixa da banda', en: 'Adjust payouts to members, substitute musicians, and band fund retention', es: 'Ajusta los pagos a miembros, músicos sustitutos y fondo de caja de la banda' },
  cacheSplitGrossLabel: { pt: 'Cachê Total Bruto', en: 'Gross Total Cachet', es: 'Caché Total Bruto' },
  cacheSplitFundLabel: { pt: 'Retenção para Caixa da Banda', en: 'Band Fund Deduction', es: 'Retención para Caja de la Banda' },
  cacheSplitSubstitutesTitle: { pt: 'Músicos Substitutos / Músicos Contratados', en: 'Substitute / Hired Musicians', es: 'Músicos Sustitutos / Músicos Contratados' },
  cacheSplitMembersTitle: { pt: 'Divisão entre Integrantes Oficiais', en: 'Official Members Split', es: 'División entre Integrantes Oficiales' },
  cacheSplitAddSubBtn: { pt: 'Adicionar Substituto', en: 'Add Substitute', es: 'Añadir Sustituto' },
  cacheSplitSaveBtn: { pt: 'Salvar Divisão de Cachê', en: 'Save Cachet Split', es: 'Guardar División de Caché' },
  cacheSplitAutoBtn: { pt: 'Divisão Igualitária Automática', en: 'Auto Equal Split', es: 'División Igualitaria Automática' },

  // Edit Finance Entry Modal
  financeModalTitle: { pt: 'Movimentação Financeira', en: 'Financial Transaction', es: 'Movimiento Financiero' },
  financeTypeLabel: { pt: 'Tipo de Movimentação', en: 'Transaction Type', es: 'Tipo de Movimiento' },
  financeIncome: { pt: 'Entrada (+)', en: 'Income (+)', es: 'Ingreso (+)' },
  financeExpense: { pt: 'Saída (-)', en: 'Expense (-)', es: 'Gasto (-)' },
  financeAmountLabel: { pt: 'Valor (R$)', en: 'Amount ($)', es: 'Importe ($)' },
  financeDescLabel: { pt: 'Descrição / Motivo', en: 'Description / Purpose', es: 'Descripción / Motivo' },
  financeDescPlaceholder: { pt: 'Ex: Compra de cabos, Patrocínio, Combustível van...', en: 'e.g. Cables purchase, Sponsorship, Van gas...', es: 'Ej: Compra de cables, Patrocinio, Gasolina de la furgoneta...' },
  financeDateLabel: { pt: 'Data', en: 'Date', es: 'Fecha' },
  financeCategoryLabel: { pt: 'Categoria', en: 'Category', es: 'Categoría' },
  financeSaveBtn: { pt: 'Salvar Movimentação', en: 'Save Transaction', es: 'Guardar Movimiento' },

  // Edit Band Member Modal
  memberModalTitle: { pt: 'Gerenciar Integrante da Banda', en: 'Manage Band Member', es: 'Gestionar Integrante de la Banda' },
  memberNameLabel: { pt: 'Nome Completo', en: 'Full Name', es: 'Nombre Completo' },
  memberRoleLabel: { pt: 'Instrumento / Função', en: 'Instrument / Role', es: 'Instrumento / Rol' },
  memberRolePlaceholder: { pt: 'Ex: Guitarra Solo, Backing Vocal', en: 'e.g. Lead Guitar, Backing Vocals', es: 'Ej: Guitarra Solista, Coros' },
  memberPhoneLabel: { pt: 'Telefone / WhatsApp', en: 'Phone / WhatsApp', es: 'Teléfono / WhatsApp' },
  memberStatusActive: { pt: 'Ativo na Banda', en: 'Active in Band', es: 'Activo en la Banda' },
  memberStatusInactive: { pt: 'Inativo / Pausado', en: 'Inactive / Paused', es: 'Inactivo / Pausado' },
  memberSaveBtn: { pt: 'Salvar Integrante', en: 'Save Member', es: 'Guardar Integrante' },
  memberRemoveBtn: { pt: 'Remover da Banda', en: 'Remove from Band', es: 'Eliminar de la Banda' },

  // Setlist / Playlist Editor
  setlistEditorTitle: { pt: 'Repertório do Evento / Setlist', en: 'Event Repertoire / Setlist', es: 'Repertorio del Evento / Setlist' },
  setlistAddBreakBtn: { pt: 'Adicionar Pausa', en: 'Add Break', es: 'Añadir Pausa' },
  setlistAddNoticeBtn: { pt: 'Adicionar Recado', en: 'Add Announcement', es: 'Añadir Aviso' },
  setlistTotalDurationLabel: { pt: 'Tempo Total Estimado:', en: 'Total Estimated Time:', es: 'Tiempo Total Estimado:' },
  setlistSearchSongPlaceholder: { pt: '🔍 Digite para buscar música ou banda no repertório...', en: '🔍 Type to search song or band in repertoire...', es: '🔍 Escribe para buscar canción o banda en el repertorio...' },
  setlistSaveBtn: { pt: 'Salvar Setlist', en: 'Save Setlist', es: 'Guardar Setlist' },

  // General Buttons & Actions
  btnConfirm: { pt: 'Confirmar', en: 'Confirm', es: 'Confirmar' },
  btnCancel: { pt: 'Cancelar', en: 'Cancel', es: 'Cancelar' },
  btnSave: { pt: 'Salvar', en: 'Save', es: 'Guardar' },
  btnClose: { pt: 'Fechar', en: 'Close', es: 'Cerrar' },
  btnDelete: { pt: 'Excluir', en: 'Delete', es: 'Eliminar' },
  btnEdit: { pt: 'Editar', en: 'Edit', es: 'Editar' },
  btnShare: { pt: 'Compartilhar', en: 'Share', es: 'Compartir' }
};

for (const [key, val] of Object.entries(webExtra)) {
  dict.pt[key] = val.pt;
  dict.en[key] = val.en;
  dict.es[key] = val.es;
}

const fileContent = `/**
 * BandLink Internationalization (i18n) Engine
 * Multi-language support: English (Default), Portuguese, Spanish
 */
(function() {
  const translations = ${JSON.stringify(dict, null, 2)};

  // DEFAULT LANGUAGE: ENGLISH ('en')
  let currentLang = (typeof localStorage !== 'undefined' && localStorage.getItem('bandlink_lang')) || 'en';

  function getCurrentLanguage() {
    return currentLang;
  }

  function t(key, fallback = '') {
    if (!key) return fallback;
    const langObj = translations[currentLang] || translations['en'];
    if (langObj && langObj[key] !== undefined) {
      return langObj[key];
    }
    // Fallback to English
    if (translations['en'] && translations['en'][key] !== undefined) {
      return translations['en'][key];
    }
    // Fallback to Portuguese
    if (translations['pt'] && translations['pt'][key] !== undefined) {
      return translations['pt'][key];
    }
    return fallback || key;
  }

  function setLanguage(lang) {
    if (!['en', 'pt', 'es'].includes(lang)) return;
    currentLang = lang;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bandlink_lang', lang);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-ES' : 'en-US';
      applyTranslations();
    }
    
    if (typeof showToast === 'function') {
      showToast(t('languageChangedToast'), 'success');
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }
  }

  function applyTranslations() {
    // Document title
    const titles = {
      en: 'BandLink • The Social Network & Platform for Musicians and Bands',
      pt: 'BandLink • A Rede Social e Plataforma para Músicos e Bandas',
      es: 'BandLink • La Red Social y Plataforma para Músicos y Bandas'
    };
    if (titles[currentLang]) {
      document.title = titles[currentLang];
    }

    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const text = t(key);
        if (text && text !== key) {
          el.textContent = text;
        }
      }
    });

    // HTML content
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key) {
        const html = t(key);
        if (html && html !== key) {
          el.innerHTML = html;
        }
      }
    });

    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        const ph = t(key);
        if (ph && ph !== key) {
          el.placeholder = ph;
        }
      }
    });

    // Titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        const tt = t(key);
        if (tt && tt !== key) {
          el.title = tt;
        }
      }
    });

    // Aria labels
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (key) {
        const aria = t(key);
        if (aria && aria !== key) {
          el.setAttribute('aria-label', aria);
        }
      }
    });

    // Update Language UI in Options if rendered
    if (typeof updateOptionsLanguageUI === 'function') {
      updateOptionsLanguageUI();
    }
  }

  if (typeof window !== 'undefined') {
    window.i18n = {
      t,
      setLanguage,
      getCurrentLanguage,
      applyTranslations,
      translations
    };
    window.t = t;
    window.setLanguage = setLanguage;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { t, setLanguage, getCurrentLanguage, applyTranslations, translations };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyTranslations);
    } else {
      setTimeout(applyTranslations, 10);
    }
  }
})();
`;

const outputPath = path.resolve(__dirname, 'assets/i18n.js');
fs.writeFileSync(outputPath, fileContent, 'utf8');
console.log('Successfully generated i18n.js! Total bytes:', fileContent.length);
