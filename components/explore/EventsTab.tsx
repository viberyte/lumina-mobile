import React, { useState, useEffect, useMemo, useRef } from "react";
import { Image } from 'expo-image';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Pressable, Animated, Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, typography, spacing } from "../../theme";
import luminaApi from "../../services/luminaApi";
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 420;
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_HEIGHT = 340;

// ─── Upscale venue list ────────────────────────────────────────────────────
const UPSCALE_VENUES = [
  'tao', 'marquee', 'lavo', 'avenue', 'fleur room', 'highlight room',
  'ph-d', 'phd', 'magic hour', 'silver lining', 'loosie', 'little sister',
  '1 oak', 'catch', 'omnia', 'jewel', 'hakkasan', 'skylight',
];
const isUpscaleVenue = (v?: string) => !!v && UPSCALE_VENUES.some(u => v.toLowerCase().includes(u));
const isUpscaleEvent = (e: Event) => isUpscaleVenue(e.venue_name) || e.source_type === 'tao';
const isRooftopEvent = (e: Event) => `${e.name} ${e.venue_name || ''}`.toLowerCase().match(/rooftop|roof top|sky bar|skybar/) != null;
const isDayParty   = (e: Event) => `${e.name} ${e.event_type || ''}`.toLowerCase().match(/day party|brunch party|afternoon/) != null;

// ─── Vibe intents (human-question-driven) ────────────────────────────────
const VIBES = [
  { id: 'all',      label: 'All' },
  { id: 'upscale',  label: 'Dressed Up' },
  { id: 'turnup',   label: 'Turn Up' },
  { id: 'date',     label: 'Date Night' },
  { id: 'rooftop',  label: 'Rooftop' },
  { id: 'afro',     label: 'Afrobeats' },
  { id: 'latin',    label: 'Latin' },
  { id: 'house',    label: 'House' },
];

// ─── Editorial sections (answer a human question) ────────────────────────
const SECTIONS = [
  { key: 'pick',     headline: 'Your move tonight',          sub: 'The city is alive right now',    upscale: false },
  { key: 'upscale',  headline: 'Best for a dressed-up night',  sub: 'Upscale lounges & rooftops',          upscale: true  },
  { key: 'tonight',  headline: 'Where to go tonight',        sub: 'Doors open now or soon',              upscale: false },
  { key: 'weekend',  headline: 'Plan your weekend',          sub: 'Best bets for Fri & Sat',             upscale: false },
  { key: 'afro',     headline: 'Afrobeats & Amapiano',       sub: 'African rhythms in the city',         upscale: false },
  { key: 'latin',    headline: 'Latin nights',               sub: 'Reggaeton, salsa, bachata',           upscale: false },
  { key: 'house',    headline: 'House & Electronic',         sub: 'Underground to rooftop',              upscale: false },
  { key: 'hiphop',   headline: 'Hip-Hop & R&B',             sub: 'The culture, all night',              upscale: false },
];

// ─── Types ────────────────────────────────────────────────────────────────
interface Event {
  id: number; name: string; venue_name?: string;
  image_url?: string; cover_image_url?: string;
  date?: string; start_time?: string;
  music_genre?: string; event_type?: string; source_type?: string;
}
interface EventsTabProps { filters?: { city?: string; searchQuery?: string; genre?: string[]; day?: string[]; type?: string[] }; }

// ─── Date utils ───────────────────────────────────────────────────────────
const parseDate = (s: string): Date => {
  if (!s) return new Date();
  if (s.includes('T')) return new Date(s);
  const p = s.split('-').map(Number);
  return p.length === 3 ? new Date(p[0], p[1]-1, p[2]) : new Date(s);
};
const getDate = (e: Event): Date | null => e.date ? parseDate(e.date) : e.start_time ? parseDate(e.start_time) : null;

const fmtDate = (e: Event) => {
  const d = getDate(e);
  if (!d) return { label: 'TBA', isTonight: false, isTomorrow: false };
  const today = new Date(); today.setHours(0,0,0,0);
  const ev = new Date(d); ev.setHours(0,0,0,0);
  const diff = Math.round((ev.getTime() - today.getTime()) / 86400000);
  const isTonight = diff === 0, isTomorrow = diff === 1;
  const label = isTonight ? 'Tonight' : isTomorrow ? 'Tomorrow' :
    diff <= 6 ? d.toLocaleDateString('en-US',{weekday:'short'}) :
    d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return { label, isTonight, isTomorrow };
};

const isTonightFn  = (e: Event) => { const d = getDate(e); return !!d && d.toDateString() === new Date().toDateString(); };
const isWeekendFn  = (e: Event) => {
  const d = getDate(e); if (!d) return false;
  const dow = d.getDay(), diff = Math.floor((d.getTime()-Date.now())/86400000);
  return (dow===5||dow===6||dow===0) && diff>=0 && diff<=7;
};
const genreCat = (e: Event) => {
  const g = (e.music_genre||'').toLowerCase(), n = e.name.toLowerCase();
  if (g.includes('afrobeat')||g.includes('amapiano')||n.includes('afro')||n.includes('amapiano')) return 'afro';
  if (g.includes('latin')||g.includes('reggaeton')||g.includes('bachata')) return 'latin';
  if (g.includes('house')||g.includes('tech house')||g.includes('afro house')) return 'house';
  if (g.includes('hip-hop')||g.includes('hip hop')||g.includes('rap')||g.includes('r&b')) return 'hiphop';
  return null;
};

const normalizeCity = (c?: string) => {
  if (c === 'Near Me') return 'New York';
  const m: Record<string,string> = { Manhattan:'New York', Brooklyn:'New York', Queens:'New York', Bronx:'New York', 'Staten Island':'New York', 'Jersey City':'New Jersey', Newark:'New Jersey', 'North Jersey':'New York' };
  return m[c||''] || c || 'New York';
};

// ─── Animated pressable ───────────────────────────────────────────────────
const Press = ({ children, style, onPress }: any) => {
  const s = useRef(new Animated.Value(1)).current;
  return (
    <Pressable onPress={onPress}
      onPressIn={()=>Animated.spring(s,{toValue:0.96,useNativeDriver:true,speed:60,bounciness:3}).start()}
      onPressOut={()=>Animated.spring(s,{toValue:1,useNativeDriver:true,speed:60,bounciness:3}).start()}>
      <Animated.View style={[style,{transform:[{scale:s}]}]}>{children}</Animated.View>
    </Pressable>
  );
};

// ─── Hero ─────────────────────────────────────────────────────────────────
const Hero = ({ event, onPress }: { event: Event; onPress: ()=>void }) => {
  const s = useRef(new Animated.Value(1)).current;
  const img = event.image_url || event.cover_image_url;
  const { label } = fmtDate(event);
  const upscale = isUpscaleEvent(event);

  return (
    <Pressable onPress={onPress}
      onPressIn={()=>{ Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Animated.spring(s,{toValue:0.975,useNativeDriver:true,speed:50,bounciness:3}).start(); }}
      onPressOut={()=>Animated.spring(s,{toValue:1,useNativeDriver:true,speed:50,bounciness:3}).start()}>
      <Animated.View style={[styles.hero,{transform:[{scale:s}]}]}>
        {img
          ? <Image source={{uri:img}} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} priority="high" cachePolicy="memory-disk"/>
          : <View style={[StyleSheet.absoluteFill,{backgroundColor:colors.zinc[900],justifyContent:'center',alignItems:'center'}]}>
              <Ionicons name="musical-notes" size={56} color={colors.zinc[700]}/>
            </View>
        }
        <LinearGradient colors={['rgba(0,0,0,0.05)','rgba(0,0,0,0.55)','rgba(0,0,0,0.97)']} locations={[0,0.45,1]} style={StyleSheet.absoluteFill}/>

        {/* Minimal top label */}
        <View style={styles.heroTop}>
          <BlurView intensity={28} tint="dark" style={styles.heroTopPill}>
            <View style={[styles.heroTopDot,{backgroundColor: upscale ? '#D4AF6A' : '#A78BFA'}]}/>
            <Text style={styles.heroTopText}>{upscale ? 'UPSCALE PICK' : 'TONIGHT'}</Text>
          </BlurView>
        </View>

        {/* Bottom content */}
        <View style={styles.heroBottom}>
          <Text style={styles.heroLabel}>{label}</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{event.name}</Text>
          <Text style={styles.heroVenue} numberOfLines={1}>{event.venue_name || 'Venue TBA'}</Text>

          <View style={styles.heroCTA}>
            <Text style={styles.heroCTAText}>View Details</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff"/>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ─── Vibe pill ────────────────────────────────────────────────────────────
const VibePill = ({ vibe, active, onPress }: { vibe: any; active: boolean; onPress: ()=>void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{vibe.label.toUpperCase()}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Event card ───────────────────────────────────────────────────────────
const Card = ({ event, onPress }: { event: Event; onPress: ()=>void }) => {
  const img = event.image_url || event.cover_image_url;
  const { label, isTonight } = fmtDate(event);
  const upscale = isUpscaleEvent(event);

  return (
    <Press style={styles.card} onPress={onPress}>
      {img
        ? <Image source={{uri:img}} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk"/>
        : <View style={[StyleSheet.absoluteFill,{backgroundColor:colors.zinc[900]}]}/>
      }
      <LinearGradient colors={['transparent','rgba(0,0,0,0.65)','rgba(0,0,0,0.96)']} locations={[0.3,0.65,1]} style={StyleSheet.absoluteFill}/>

      {/* Date pill — minimal */}
      <View style={styles.cardTop}>
        <BlurView intensity={35} tint="dark" style={[styles.cardPill, isTonight && styles.cardPillTonight]}>
          <Text style={[styles.cardPillText, isTonight && styles.cardPillTextTonight]}>{label}</Text>
        </BlurView>
        {upscale && <View style={styles.cardDot}/>}
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.cardTitle} numberOfLines={2}>{event.name}</Text>
        <Text style={styles.cardVenue} numberOfLines={1}>{event.venue_name || 'Venue TBA'}</Text>
        {event.music_genre ? (
          <View style={styles.genreTag}>
            <Text style={styles.genreTagText}>{event.music_genre}</Text>
          </View>
        ) : null}
      </View>
    </Press>
  );
};

// ─── Section ──────────────────────────────────────────────────────────────
const Section = ({ meta, events, onSeeAll, onEvent }: { meta: any; events: Event[]; onSeeAll: ()=>void; onEvent: (e:Event)=>void }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <View style={{flex:1}}>
        <Text style={[styles.sectionHeadline, meta.upscale && styles.sectionHeadlineGold]}>{meta.headline}</Text>
        <Text style={styles.sectionSub}>{meta.sub}</Text>
      </View>
      <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7} style={styles.seeAll}>
        <Text style={styles.seeAllText}>See all</Text>
      </TouchableOpacity>
    </View>
    {meta.upscale && <View style={styles.goldLine}/>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {events.map(e => <Card key={e.id} event={e} onPress={()=>onEvent(e)}/>)}
    </ScrollView>
  </View>
);

// ─── Main ─────────────────────────────────────────────────────────────────
export default function EventsTab({ filters = {} }: EventsTabProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<Event[]>([]);
  const [vibe, setVibe] = useState('all');

  useEffect(() => { load(); }, [filters.city]);

  const load = async () => {
    try {
      setLoading(true);
      const ev = await luminaApi.getEvents(normalizeCity(filters.city));
      setAll(ev || []);
    } catch { setAll([]); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let ev = [...all];

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      ev = ev.filter(e => e.name.toLowerCase().includes(q) || e.venue_name?.toLowerCase().includes(q));
    }

    if (vibe !== 'all') {
      ev = ev.filter(e => {
        if (vibe === 'upscale')  return isUpscaleEvent(e);
        if (vibe === 'turnup')   return !isUpscaleEvent(e) && !isRooftopEvent(e);
        if (vibe === 'date')     return isUpscaleEvent(e) || isRooftopEvent(e);
        if (vibe === 'rooftop')  return isRooftopEvent(e);
        if (vibe === 'afro')     return genreCat(e) === 'afro';
        if (vibe === 'latin')    return genreCat(e) === 'latin';
        if (vibe === 'house')    return genreCat(e) === 'house';
        return true;
      });
    }

    return ev.sort((a,b) => {
      const da = getDate(a), db = getDate(b);
      if (!da) return 1; if (!db) return -1;
      return da.getTime()-db.getTime();
    });
  }, [all, filters.searchQuery, vibe]);

  const hero = useMemo(() => {
    if (filters.searchQuery || vibe !== 'all') return null;
    const candidates = all.filter(e => (e.image_url||e.cover_image_url) && isTonightFn(e));
    if (candidates.length) return candidates.sort((a,b)=>(isUpscaleEvent(b)?1:0)-(isUpscaleEvent(a)?1:0))[0];
    return all.find(e => e.image_url||e.cover_image_url) || null;
  }, [all, filters.searchQuery, vibe]);

  const sections = useMemo(() => {
    const used = new Set<number>();
    if (hero) used.add(hero.id);

    const map: Record<string,Event[]> = { pick:[], upscale:[], tonight:[], weekend:[], afro:[], latin:[], house:[], hiphop:[] };

    // "pick" = tonight's top 3 diverse events
    filtered.filter(e=>isTonightFn(e)&&(e.image_url||e.cover_image_url)&&!used.has(e.id)).slice(0,3).forEach(e=>{map.pick.push(e);used.add(e.id);});

    // upscale — max 5
    filtered.filter(e=>isUpscaleEvent(e)&&!used.has(e.id)).slice(0,5).forEach(e=>{map.upscale.push(e);used.add(e.id);});

    // tonight — max 6
    filtered.filter(e=>isTonightFn(e)&&!used.has(e.id)).slice(0,6).forEach(e=>{map.tonight.push(e);used.add(e.id);});

    // weekend — max 6
    filtered.filter(e=>isWeekendFn(e)&&!used.has(e.id)).slice(0,6).forEach(e=>{map.weekend.push(e);used.add(e.id);});

    // genre sections — max 5 each
    filtered.forEach(e=>{
      if (used.has(e.id)) return;
      const c = genreCat(e);
      if (c && map[c] && map[c].length < 5) { map[c].push(e); used.add(e.id); }
    });

    return SECTIONS.map(s=>({...s, events: map[s.key]||[]})).filter(s=>s.events.length>0).slice(0,6);
  }, [filtered, hero]);

  const go = (e: Event) => router.push(`/event/${e.id}`);
  const seeAll = (title: string) => router.push({ pathname:'/see-all-events', params:{ title, city: filters.city||'New York' }});

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="small" color={colors.violet[500]}/>
      <Text style={styles.loadingText}>Finding tonight's best spots…</Text>
    </View>
  );

  if (!hero && sections.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>Nothing yet</Text>
      <Text style={styles.emptySub}>Check back soon</Text>
    </View>
  );

  return (
    <ScrollView style={{flex:1}} showsVerticalScrollIndicator={false}>
      {/* Vibe filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vibes} style={{marginTop:spacing.md}}>
        {VIBES.map(v=>(
          <VibePill key={v.id} vibe={v} active={vibe===v.id} onPress={()=>{ Haptics.selectionAsync(); setVibe(v.id); }}/>
        ))}
      </ScrollView>

      {/* Hero */}
      {hero && <View style={styles.heroWrap}><Hero event={hero} onPress={()=>go(hero)}/></View>}

      {/* Editorial sections */}
      {sections.map(s=>(
        <Section key={s.key} meta={s} events={s.events} onSeeAll={()=>seeAll(s.headline)} onEvent={go}/>
      ))}

      <View style={{height:100}}/>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { flex:1, justifyContent:'center', alignItems:'center', paddingTop:80, gap:10 },
  loadingText: { color:colors.zinc[500], fontSize:typography.sizes.sm },
  emptyTitle: { color:colors.zinc[400], fontSize:typography.sizes.md, fontWeight:'600' },
  emptySub: { color:colors.zinc[600], fontSize:typography.sizes.sm },

  // Vibe pills
  vibes: { paddingHorizontal:spacing.lg, gap:8, paddingBottom:4 },
  pill: {
    paddingHorizontal:14, paddingVertical:7,
    borderRadius:4, backgroundColor:'transparent',
    borderWidth:1, borderColor:colors.zinc[800],
  },
  pillActive: { backgroundColor:colors.zinc[800], borderColor:colors.zinc[600] },
  pillText: { fontSize:11, fontWeight:'700', color:colors.zinc[600], letterSpacing:0.8 },
  pillTextActive: { color:colors.white },

  // Hero
  heroWrap: { paddingHorizontal:spacing.lg, paddingTop:spacing.lg },
  hero: { height:HERO_HEIGHT, borderRadius:20, overflow:'hidden', backgroundColor:colors.zinc[900] },
  heroTop: { position:'absolute', top:16, left:16 },
  heroTopPill: {
    flexDirection:'row', alignItems:'center', gap:6,
    paddingHorizontal:11, paddingVertical:6,
    borderRadius:4, overflow:'hidden',
    borderWidth:1, borderColor:'rgba(255,255,255,0.08)',
  },
  heroTopDot: { width:5, height:5, borderRadius:3 },
  heroTopText: { fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.8)', letterSpacing:1.2 },
  heroBottom: { position:'absolute', bottom:0, left:0, right:0, padding:20, gap:4 },
  heroLabel: { fontSize:11, fontWeight:'600', color:'rgba(255,255,255,0.45)', letterSpacing:0.6, textTransform:'uppercase', marginBottom:2 },
  heroTitle: { fontSize:26, fontWeight:'700', color:'#fff', lineHeight:32, letterSpacing:-0.5 },
  heroVenue: { fontSize:14, color:'rgba(255,255,255,0.5)', fontWeight:'500', marginTop:2 },
  heroCTA: { flexDirection:'row', alignItems:'center', gap:6, marginTop:14, alignSelf:'flex-start', borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.2)', paddingBottom:2 },
  heroCTAText: { fontSize:13, fontWeight:'600', color:'#fff' },

  // Section
  section: { marginTop:36 },
  sectionHead: { flexDirection:'row', alignItems:'flex-start', paddingHorizontal:spacing.lg, marginBottom:14 },
  sectionHeadline: { fontSize:18, fontWeight:'700', color:'#fff', letterSpacing:-0.3 },
  sectionHeadlineGold: { color:'#D4AF6A' },
  sectionSub: { fontSize:12, color:colors.zinc[600], marginTop:2, fontWeight:'500' },
  seeAll: { paddingTop:3 },
  seeAllText: { fontSize:12, fontWeight:'600', color:colors.zinc[500] },
  goldLine: { height:1, backgroundColor:'rgba(212,175,106,0.15)', marginHorizontal:spacing.lg, marginBottom:14 },
  row: { paddingHorizontal:spacing.lg, gap:14 },

  // Cards
  card: { width:CARD_WIDTH, height:CARD_HEIGHT, borderRadius:16, overflow:'hidden', backgroundColor:colors.zinc[900] },
  cardTop: { position:'absolute', top:12, left:12, right:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  cardPill: { paddingHorizontal:9, paddingVertical:5, borderRadius:4, overflow:'hidden', borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  cardPillTonight: { borderColor:'rgba(167,139,250,0.3)' },
  cardPillText: { fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.6)', letterSpacing:0.6 },
  cardPillTextTonight: { color:'#C4B5FD' },
  cardDot: { width:6, height:6, borderRadius:3, backgroundColor:'#D4AF6A' },
  cardBottom: { position:'absolute', bottom:0, left:0, right:0, padding:14 },
  cardTitle: { fontSize:15, fontWeight:'700', color:'#fff', lineHeight:20, marginBottom:3 },
  genreTag: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(139,92,246,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
  },
  genreTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a78bfa',
    letterSpacing: 0.3,
  },
  cardVenue: { fontSize:12, color:'rgba(255,255,255,0.4)', fontWeight:'500' },
});
