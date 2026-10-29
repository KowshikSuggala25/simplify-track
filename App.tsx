import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { API_BASE_URL, CACHE_KEY } from './src/config';

type Direction = 'debit' | 'credit';
type Transaction = {
  id: string;
  account_id: string;
  occurred_at: string;
  direction: Direction;
  amount_minor: number;
  currency: string;
  merchant: string;
  category: string;
  status: string;
  updated_at?: string;
};
type Account = { id: string; bank: string; type: string; last4: string; nickname: string };
type ApiPage = { items: Transaction[]; next_cursor: string | null; sync_token: string };
type Cache = { transactions: Transaction[]; accounts: Account[]; syncToken: string | null; savedAt: string };
type Row = { kind: 'month'; key: string; spend: number; income: number; count: number } | { kind: 'transaction'; transaction: Transaction };

const money = (minor: number) =>
  `₹${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
const dayLabel = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

function mergeTransactions(current: Transaction[], incoming: Transaction[]) {
  const byId = new Map(current.map((transaction) => [transaction.id, transaction]));
  incoming.forEach((transaction) => byId.set(transaction.id, transaction));
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
}

function buildRows(transactions: Transaction[], query: string): Row[] {
  const filtered = transactions.filter((transaction) =>
    transaction.merchant.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const groups = new Map<string, Transaction[]>();
  filtered.forEach((transaction) => {
    const key = transaction.occurred_at.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
  });
  return Array.from(groups.entries()).flatMap(([key, items]) => [
    {
      kind: 'month' as const,
      key,
      spend: items.filter((item) => item.direction === 'debit').reduce((sum, item) => sum + item.amount_minor, 0),
      income: items.filter((item) => item.direction === 'credit').reduce((sum, item) => sum + item.amount_minor, 0),
      count: items.length,
    },
    ...items.map((transaction) => ({ kind: 'transaction' as const, transaction })),
  ]);
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [syncToken, setSyncToken] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveCache = useCallback(async (nextTransactions: Transaction[], nextAccounts: Account[], token: string | null) => {
    const cache: Cache = { transactions: nextTransactions, accounts: nextAccounts, syncToken: token, savedAt: new Date().toISOString() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }, []);

  const loadPage = useCallback(async (reset: boolean, cacheAccounts: Account[] = accounts) => {
    if (reset) setRefreshing(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const page = await request<ApiPage>(`/v1/transactions?limit=50${!reset && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      const next = reset ? mergeTransactions([], page.items) : mergeTransactions(transactions, page.items);
      setTransactions(next);
      setCursor(page.next_cursor);
      setSyncToken(page.sync_token);
      setOffline(false);
      await saveCache(next, cacheAccounts, page.sync_token);
    } catch (requestError) {
      if (reset && transactions.length === 0) setError(requestError instanceof Error ? requestError.message : 'Unable to load transactions');
      setOffline(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [accounts, cursor, saveCache, transactions]);

  const hydrate = useCallback(async () => {
    try {
      const cache = await AsyncStorage.getItem(CACHE_KEY);
      if (cache) {
        const saved = JSON.parse(cache) as Cache;
        setTransactions(saved.transactions);
        setAccounts(saved.accounts);
        setSyncToken(saved.syncToken);
        setOffline(true);
      }
      const accountResponse = await request<{ items: Account[] }>('/v1/accounts');
      setAccounts(accountResponse.items);
      await loadPage(true, accountResponse.items);
    } catch {
      await loadPage(true);
    }
  }, [loadPage]);

  useEffect(() => {
    void hydrate();
    // Hydration is intentionally a one-time bootstrap; subsequent updates use
    // the explicit pagination and refresh handlers.
  }, []);

  const refresh = async () => {
    if (syncToken) {
      try {
        const changes = await request<{ items: Array<Transaction | { id: string; deleted: true }>; next_cursor: string | null; sync_token: string }>(
          `/v1/transactions/changes?since=${encodeURIComponent(syncToken)}`,
        );
        const changed = changes.items;
        const removed = new Set(changed.filter((item): item is { id: string; deleted: true } => 'deleted' in item).map((item) => item.id));
        const updates = changed.filter((item): item is Transaction => !('deleted' in item));
        const next = mergeTransactions(transactions.filter((item) => !removed.has(item.id)), updates);
        setTransactions(next);
        setSyncToken(changes.sync_token);
        setOffline(false);
        await saveCache(next, accounts, changes.sync_token);
        return;
      } catch {
        // A failed incremental sync falls back to a full page refresh below.
      }
    }
    await loadPage(true);
  };

  const rows = useMemo(() => buildRows(transactions, query), [query, transactions]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SIMPLIFY MONEY</Text>
          <Text style={styles.title}>Track</Text>
        </View>
        <View style={styles.accountBadge}>
          <Text style={styles.accountBadgeText}>{accounts.length} accounts</Text>
        </View>
      </View>
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline mode · showing your latest saved data</Text>
        </View>
      )}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by merchant"
          placeholderTextColor="#8b928d"
          style={styles.searchInput}
          accessibilityLabel="Search transactions by merchant"
        />
        {query.length > 0 && <Pressable onPress={() => setQuery('')}><Text style={styles.clear}>×</Text></Pressable>}
      </View>
      {error && transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Couldn’t load Track</Text>
          <Text style={styles.emptyBody}>Check that the mock API is running, then try again.</Text>
          <Pressable style={styles.retry} onPress={() => void loadPage(true)}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator color="#17765d" style={styles.loader} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.kind === 'month' ? `month-${item.key}` : item.transaction.id}
          renderItem={({ item }) =>
            item.kind === 'month' ? (
              <View style={styles.monthCard}>
                <View>
                  <Text style={styles.monthTitle}>{monthLabel(item.key)}</Text>
                  <Text style={styles.monthCount}>{item.count} transactions</Text>
                </View>
                <View style={styles.monthTotals}>
                  <Text style={styles.spend}>{money(item.spend)} spent</Text>
                  <Text style={styles.income}>{money(item.income)} earned</Text>
                </View>
              </View>
            ) : (
              <Pressable style={styles.transaction} onPress={() => setSelected(item.transaction)}>
                <View style={styles.transactionIcon}><Text style={styles.transactionIconText}>{item.transaction.merchant.slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.transactionMain}>
                  <Text style={styles.merchant} numberOfLines={1}>{item.transaction.merchant}</Text>
                  <Text style={styles.meta}>{item.transaction.category} · {dayLabel(item.transaction.occurred_at)}</Text>
                </View>
                <Text style={item.transaction.direction === 'debit' ? styles.debit : styles.credit}>
                  {item.transaction.direction === 'debit' ? '-' : '+'}{money(item.transaction.amount_minor)}
                </Text>
              </Pressable>
            )
          }
          onEndReached={() => { if (cursor && !query && !loadingMore) void loadPage(false); }}
          onEndReachedThreshold={0.45}
          onRefresh={() => void refresh()}
          refreshing={refreshing}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#17765d" />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No transactions found</Text><Text style={styles.emptyBody}>Try a different merchant name.</Text></View>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#17765d" style={styles.footerLoader} /> : null}
          contentContainerStyle={rows.length === 0 ? styles.emptyList : styles.list}
        />
      )}
      <Modal visible={selected !== null} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.modalBackdrop}>
            <View style={styles.detailSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.detailHeader}><Text style={styles.detailTitle}>Transaction details</Text><Pressable onPress={() => setSelected(null)}><Text style={styles.close}>×</Text></Pressable></View>
              <Text style={styles.detailMerchant}>{selected.merchant}</Text>
              <Text style={selected.direction === 'debit' ? styles.detailDebit : styles.detailCredit}>{selected.direction === 'debit' ? '-' : '+'}{money(selected.amount_minor)}</Text>
              <Detail label="Date" value={dayLabel(selected.occurred_at)} />
              <Detail label="Category" value={selected.category} />
              <Detail label="Status" value={selected.status} />
              <Detail label="Account" value={accounts.find((account) => account.id === selected.account_id)?.nickname ?? selected.account_id} />
              <Detail label="Transaction ID" value={selected.id} />
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f8f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18 },
  eyebrow: { color: '#17765d', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#153c32', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  accountBadge: { backgroundColor: '#e5f1eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  accountBadgeText: { color: '#17765d', fontSize: 12, fontWeight: '700' },
  offlineBanner: { backgroundColor: '#fff2d9', paddingVertical: 9, paddingHorizontal: 20 },
  offlineText: { color: '#8a5d19', fontSize: 12, fontWeight: '600' },
  searchBox: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e2e8e3', borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 14, marginHorizontal: 20, paddingHorizontal: 14 },
  searchIcon: { color: '#17765d', fontSize: 25, marginRight: 8 },
  searchInput: { color: '#153c32', flex: 1, fontSize: 15, paddingVertical: 13 },
  clear: { color: '#6b756e', fontSize: 24, paddingLeft: 8 },
  list: { paddingBottom: 24 },
  monthCard: { alignItems: 'center', backgroundColor: '#e6f1eb', borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 10, padding: 16 },
  monthTitle: { color: '#153c32', fontSize: 17, fontWeight: '800' },
  monthCount: { color: '#61736a', fontSize: 12, marginTop: 3 },
  monthTotals: { alignItems: 'flex-end' },
  spend: { color: '#a44b43', fontSize: 13, fontWeight: '700' },
  income: { color: '#17765d', fontSize: 12, marginTop: 3 },
  transaction: { alignItems: 'center', backgroundColor: '#fff', borderBottomColor: '#eef1ee', borderBottomWidth: 1, flexDirection: 'row', marginHorizontal: 20, paddingHorizontal: 4, paddingVertical: 14 },
  transactionIcon: { alignItems: 'center', backgroundColor: '#f0e9d8', borderRadius: 22, height: 44, justifyContent: 'center', marginRight: 12, width: 44 },
  transactionIconText: { color: '#996c22', fontSize: 17, fontWeight: '800' },
  transactionMain: { flex: 1, paddingRight: 8 },
  merchant: { color: '#1e3029', fontSize: 15, fontWeight: '700' },
  meta: { color: '#7b877f', fontSize: 12, marginTop: 4 },
  debit: { color: '#b04d45', fontSize: 14, fontWeight: '700' },
  credit: { color: '#17765d', fontSize: 14, fontWeight: '700' },
  loader: { flex: 1 },
  footerLoader: { paddingVertical: 18 },
  emptyList: { flexGrow: 1 },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 32 },
  emptyTitle: { color: '#153c32', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBody: { color: '#718078', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  retry: { backgroundColor: '#17765d', borderRadius: 10, marginTop: 18, paddingHorizontal: 18, paddingVertical: 11 },
  retryText: { color: '#fff', fontWeight: '800' },
  modalBackdrop: { backgroundColor: 'rgba(17, 47, 39, 0.35)', flex: 1, justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 38 },
  sheetHandle: { alignSelf: 'center', backgroundColor: '#d8e0db', borderRadius: 4, height: 4, marginBottom: 20, width: 42 },
  detailHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  detailTitle: { color: '#153c32', fontSize: 18, fontWeight: '800' },
  close: { color: '#6b756e', fontSize: 30, lineHeight: 30 },
  detailMerchant: { color: '#153c32', fontSize: 24, fontWeight: '800', marginTop: 30 },
  detailDebit: { color: '#b04d45', fontSize: 27, fontWeight: '800', marginTop: 8 },
  detailCredit: { color: '#17765d', fontSize: 27, fontWeight: '800', marginTop: 8 },
  detailRow: { borderBottomColor: '#edf1ee', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15 },
  detailLabel: { color: '#7b877f', fontSize: 13 },
  detailValue: { color: '#25382f', flexShrink: 1, fontSize: 13, fontWeight: '700', marginLeft: 24, textAlign: 'right' },
});
