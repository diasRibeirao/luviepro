import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { api, apiDownload } from '../../api';
import { feedbackAlert as Alert } from '../../components/Feedback';
import { Text } from '../../i18n';
import { theme } from '../../theme';

type BackupItem = {
  id: string;
  description?: string | null;
  createdAt: string;
  bytes: number;
  sha256: string;
  status: 'ready' | 'invalid';
  database: string;
};

type BackupStorage = {
  state: 'ok' | 'warning' | 'down';
  writable: boolean;
  pgDump: boolean;
  pgRestore: boolean;
  persistent: boolean;
  retentionCount: number;
  detail: string;
};

type BackupListResponse = { storage: BackupStorage; items: BackupItem[] };
type BackupCheckResponse = { id: string; ok: boolean; message?: string; reasons?: string[]; objects?: number };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

function stateLabel(state: BackupStorage['state']) {
  return state === 'ok' ? 'Operacional' : state === 'warning' ? 'Atenção' : 'Indisponível';
}

export function PlatformBackupRecovery() {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const phone = width < 620;
  const [data, setData] = useState<BackupListResponse>();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string>();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await api<BackupListResponse>('/platform/backups'));
    } catch (error) {
      Alert.alert('Não foi possível carregar os backups', error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createBackup() {
    try {
      setCreating(true);
      await api('/platform/backups', { method: 'POST', body: JSON.stringify({ description: description.trim() || undefined }) });
      setDescription('');
      await load();
      Alert.alert('Backup criado', 'O snapshot do LuviePro foi gerado e o manifesto de integridade foi salvo.');
    } catch (error) {
      Alert.alert('Não foi possível criar o backup', error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setCreating(false);
    }
  }

  async function download(item: BackupItem) {
    try {
      setBusyId(item.id);
      await apiDownload(`/platform/backups/${item.id}/download`, `${item.id}.dump`);
    } catch (error) {
      Alert.alert('Não foi possível baixar o backup', error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setBusyId(undefined);
    }
  }

  async function verify(item: BackupItem) {
    try {
      setBusyId(item.id);
      const result = await api<BackupCheckResponse>(`/platform/backups/${item.id}/verify`, { method: 'POST' });
      Alert.alert(result.ok ? 'Backup íntegro' : 'Backup inválido', result.message ?? (result.reasons?.join('\n') || 'Verificação concluída.'));
    } catch (error) {
      Alert.alert('Não foi possível verificar', error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setBusyId(undefined);
    }
  }

  async function simulate(item: BackupItem) {
    try {
      setBusyId(item.id);
      const result = await api<BackupCheckResponse>(`/platform/backups/${item.id}/simulate-restore`, { method: 'POST' });
      const details = result.ok
        ? `${result.message ?? 'Preflight aprovado.'}${typeof result.objects === 'number' ? `\nObjetos identificados: ${result.objects}.` : ''}`
        : result.reasons?.join('\n') || 'O backup não passou na simulação.';
      Alert.alert(result.ok ? 'Simulação aprovada' : 'Simulação reprovada', details);
    } catch (error) {
      Alert.alert('Não foi possível simular a restauração', error instanceof Error ? error.message : 'Erro inesperado');
    } finally {
      setBusyId(undefined);
    }
  }

  if (loading && !data) return <View style={styles.loading}><ActivityIndicator color={theme.gold}/><Text style={styles.muted}>Carregando backups...</Text></View>;

  const storage = data?.storage;
  const storageOk = storage?.state === 'ok';
  const storageWarning = storage?.state === 'warning';

  return <View style={styles.root}>
    <View style={[styles.topGrid, compact && styles.topGridCompact]}>
      <View style={[styles.card, styles.createCard]}>
        <View style={styles.cardTitleRow}>
          <View style={styles.iconBox}><Ionicons name="cloud-upload-outline" size={22} color={theme.green2}/></View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Backup manual</Text>
            <Text style={styles.cardSubtitle}>Gere um snapshot protegido do PostgreSQL.</Text>
          </View>
        </View>
        <Text style={styles.label}>Descrição opcional</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: antes da atualização de setembro"
          placeholderTextColor="#93A099"
          maxLength={160}
          style={styles.input}
        />
        <Pressable disabled={creating || storage?.state === 'down'} onPress={()=>void createBackup()} style={({pressed})=>[styles.primaryButton,(creating || storage?.state === 'down')&&styles.disabled,pressed&&styles.pressed]}>
          {creating?<ActivityIndicator color="#fff"/>:<Ionicons name="cloud-upload-outline" size={18} color="#fff"/>}
          <Text style={styles.primaryButtonText}>{creating?'Criando backup...':'Criar backup'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={styles.iconBox}><Ionicons name="server-outline" size={22} color={theme.green2}/></View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Armazenamento</Text>
            <Text style={styles.cardSubtitle}>Validação do destino e das ferramentas PostgreSQL.</Text>
          </View>
          {storage?<View style={[styles.statusBadge,storageOk?styles.statusOk:storageWarning?styles.statusWarning:styles.statusDown]}><Text style={[styles.statusText,storageOk?styles.statusTextOk:storageWarning?styles.statusTextWarning:styles.statusTextDown]}>{stateLabel(storage.state)}</Text></View>:null}
        </View>
        {storage?<>
          <Text style={styles.storageDetail}>{storage.detail}</Text>
          <View style={[styles.factGrid, phone&&styles.factGridPhone]}>
            <Fact label="Gravação" value={storage.writable?'OK':'Falha'}/>
            <Fact label="pg_dump" value={storage.pgDump?'OK':'Ausente'}/>
            <Fact label="pg_restore" value={storage.pgRestore?'OK':'Ausente'}/>
            <Fact label="Persistência" value={storage.persistent?'Confirmada':'Não confirmada'}/>
          </View>
          <Text style={styles.storageFoot}>Retenção automática: últimos {storage.retentionCount} backups.</Text>
        </>:<Text style={styles.muted}>Status indisponível.</Text>}
      </View>
    </View>

    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>Backups disponíveis</Text>
        <Text style={styles.sectionSubtitle}>Verifique a integridade antes de qualquer procedimento de recuperação.</Text>
      </View>
      <Pressable onPress={()=>void load()} style={styles.refreshButton}><Ionicons name="refresh" size={16} color={theme.green2}/><Text style={styles.refreshText}>Atualizar</Text></Pressable>
    </View>

    {!data?.items.length?<View style={styles.empty}><Ionicons name="archive-outline" size={28} color={theme.muted}/><Text style={styles.emptyTitle}>Nenhum backup criado</Text><Text style={styles.muted}>Crie o primeiro backup manual para iniciar o histórico.</Text></View>:
      <View style={styles.list}>
        {data.items.map(item=><View key={item.id} style={[styles.backupCard,phone&&styles.backupCardPhone]}>
          <View style={styles.backupMain}>
            <View style={styles.backupTop}><View style={styles.successDot}/><Text style={styles.backupDescription}>{item.description || 'Backup manual'}</Text></View>
            <Text style={styles.backupMeta}>LuviePro · {formatDate(item.createdAt)} · {formatBytes(item.bytes)} · {item.database}</Text>
            <Text numberOfLines={1} style={styles.checksum}>SHA-256: {item.sha256}</Text>
          </View>
          <View style={[styles.actions,phone&&styles.actionsPhone]}>
            <Pressable disabled={busyId===item.id} onPress={()=>void download(item)} style={({pressed})=>[styles.secondaryButton,pressed&&styles.pressed]}><Ionicons name="download-outline" size={17} color={theme.green2}/><Text style={styles.secondaryText}>Baixar .dump</Text></Pressable>
            <Pressable disabled={busyId===item.id} onPress={()=>void verify(item)} style={({pressed})=>[styles.secondaryButton,pressed&&styles.pressed]}><Ionicons name="checkmark-circle-outline" size={17} color={theme.green2}/><Text style={styles.secondaryText}>Verificar</Text></Pressable>
            <Pressable disabled={busyId===item.id} onPress={()=>void simulate(item)} style={({pressed})=>[styles.secondaryButton,pressed&&styles.pressed]}><Ionicons name="shield-checkmark-outline" size={17} color={theme.green2}/><Text style={styles.secondaryText}>Simular restauração</Text></Pressable>
          </View>
        </View>)}
      </View>}

    <View style={styles.infoBox}>
      <Ionicons name="information-circle-outline" size={20} color={theme.green2}/>
      <View style={styles.flex}><Text style={styles.infoTitle}>Recuperação segura</Text><Text style={styles.infoText}>A simulação executa checksum, preflight e leitura do catálogo do PostgreSQL. Ela não altera o banco. A restauração destrutiva não é exposta nesta tela.</Text></View>
    </View>
  </View>;
}

function Fact({label,value}:{label:string;value:string}){return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{value}</Text></View>}

const styles=StyleSheet.create({
 root:{gap:18},loading:{minHeight:260,alignItems:'center',justifyContent:'center',gap:10},flex:{flex:1,minWidth:0},muted:{fontSize:11,color:theme.muted},
 topGrid:{flexDirection:'row',gap:16},topGridCompact:{flexDirection:'column'},card:{flex:1,minWidth:0,backgroundColor:'#fff',borderWidth:1,borderColor:theme.border,borderRadius:16,padding:18},createCard:{backgroundColor:'#FBFDFC'},
 cardTitleRow:{flexDirection:'row',alignItems:'center',gap:11,marginBottom:16},iconBox:{width:42,height:42,borderRadius:12,backgroundColor:theme.green50,alignItems:'center',justifyContent:'center'},cardTitle:{fontFamily:'serif',fontSize:19,fontWeight:'800',color:theme.ink},cardSubtitle:{fontSize:10.5,color:theme.muted,marginTop:3},
 label:{fontSize:10,fontWeight:'800',color:theme.ink,marginBottom:6},input:{height:44,borderWidth:1,borderColor:theme.border,borderRadius:10,paddingHorizontal:12,fontSize:12,color:theme.ink,backgroundColor:'#fff',marginBottom:10},
 primaryButton:{minHeight:44,borderRadius:10,backgroundColor:theme.green2,paddingHorizontal:16,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},primaryButtonText:{fontSize:11,fontWeight:'900',color:'#fff'},disabled:{opacity:.55},pressed:{opacity:.78},
 statusBadge:{borderRadius:999,paddingHorizontal:10,paddingVertical:6},statusOk:{backgroundColor:'#EAF5EE'},statusWarning:{backgroundColor:'#FFF5DD'},statusDown:{backgroundColor:'#FBECEC'},statusText:{fontSize:9,fontWeight:'900'},statusTextOk:{color:'#2D7350'},statusTextWarning:{color:'#8B6411'},statusTextDown:{color:theme.danger},
 storageDetail:{fontSize:11.5,color:theme.ink,marginBottom:13},factGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},factGridPhone:{flexDirection:'column'},fact:{minWidth:120,flexGrow:1,borderRadius:10,backgroundColor:'#F6F8F7',padding:10},factLabel:{fontSize:9,color:theme.muted,fontWeight:'700'},factValue:{fontSize:11,color:theme.ink,fontWeight:'900',marginTop:3},storageFoot:{fontSize:9.5,color:theme.muted,marginTop:12},
 sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:2},sectionTitle:{fontFamily:'serif',fontSize:20,fontWeight:'800',color:theme.ink},sectionSubtitle:{fontSize:10.5,color:theme.muted,marginTop:3},refreshButton:{height:38,borderRadius:9,borderWidth:1,borderColor:theme.border,backgroundColor:'#fff',paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:6},refreshText:{fontSize:10,fontWeight:'800',color:theme.green2},
 empty:{minHeight:160,borderWidth:1,borderStyle:'dashed',borderColor:theme.border,borderRadius:14,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',gap:7,padding:20},emptyTitle:{fontSize:12,fontWeight:'900',color:theme.ink},list:{gap:10},backupCard:{backgroundColor:'#fff',borderWidth:1,borderColor:theme.border,borderRadius:14,padding:15,flexDirection:'row',alignItems:'center',gap:14},backupCardPhone:{flexDirection:'column',alignItems:'stretch'},backupMain:{flex:1,minWidth:0},backupTop:{flexDirection:'row',alignItems:'center',gap:7},successDot:{width:8,height:8,borderRadius:4,backgroundColor:'#42A66D'},backupDescription:{fontSize:12,fontWeight:'900',color:theme.ink},backupMeta:{fontSize:10,color:theme.muted,marginTop:5},checksum:{fontSize:9,color:'#87958E',marginTop:5},actions:{flexDirection:'row',gap:8},actionsPhone:{width:'100%',flexWrap:'wrap'},secondaryButton:{minHeight:38,borderRadius:9,borderWidth:1,borderColor:theme.border,backgroundColor:'#fff',paddingHorizontal:11,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},secondaryText:{fontSize:9.5,fontWeight:'900',color:theme.green2},
 infoBox:{borderWidth:1,borderColor:'#CDE0D5',backgroundColor:'#F3F9F5',borderRadius:14,padding:14,flexDirection:'row',gap:10,alignItems:'flex-start'},infoTitle:{fontSize:11,fontWeight:'900',color:theme.green2},infoText:{fontSize:10,color:theme.muted,lineHeight:15,marginTop:3}
});
