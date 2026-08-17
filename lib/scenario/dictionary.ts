export type Lang = "ja" | "en";

export const DICT = {
  ja: {
    dashboard: "ダッシュボード",
    simulation: "シミュレーション",
    single: "単体",
    compare: "比較",
    yearly: "年次",
    monthly: "月次",
    table: "テーブル",
    graph: "グラフ",
    totalIncome: "総収入",
    totalExpense: "総支出",
    totalSavings: "総貯蓄",
    settingsBtn: "シミュレーション設定",
    scenarios: "シナリオ管理",
    expandAll: "すべて展開",
    collapseAll: "すべて折りたたむ",
    save: "保存",
    close: "閉じる",
    apply: "この条件を適用",
    cancel: "キャンセル",
    addScenario: "新規シナリオとして保存",
    life: "暮らし",
    education: "教育",
    events: "イベント",
    fixed: "固定費",
    variable: "変動費",
    cash: "現金",
    invest: "投資",
    profit: "利益",
    husband: "本人給与",
    wife: "配偶者給与",
    side: "副業収入",
    childAllowance: "子育て支援",
    yearsAheadLabel: "{n}年後",
    family: "家族",
    income: "収入",
    spending: "支出",
    savingsTab: "貯蓄",
    overview: "概要",
    incomeBreakdown: "収入の内訳",
    lifeBreakdown: "暮らしの内訳",
    educationBreakdown: "教育の内訳",
    eventsBreakdown: "イベントの内訳",
    expenseTotal: "支出の合計",
    savingsBreakdown: "貯蓄の内訳",

    // 設定モーダル: 家族タブ
    spouse: "配偶者",
    spouseYes: "あり",
    spouseNo: "なし",
    children: "子ども",
    addChild: "子どもを追加",
    birthYear: "生まれ年",
    ageThisYear: "今年{age}歳",

    // 設定モーダル: 収入タブ
    husbandIncome: "本人・手取り",
    wifeIncome: "配偶者・手取り",
    netMonthly: "月額",
    netBonus: "ボーナス(年)",
    yenPerMonth: "円/月",
    yenPerYear: "円/年",
    raisePerYear: "%/年 昇給",
    sideIncome: "副業収入",
    grossAnnualNote: "額面年収: {amount}/年",
    publicAllowance: "公的手当",
    publicAllowanceDetail: "0-2歳: 1.5万円/月、3歳-高校生: 1万円/月(自動計算)",
    netIncomeHelp:
      "税金・社会保険料を引いた後の手取り額を入力してください。額面年収は (月額×12+ボーナス)÷0.8 で自動計算され、参考表示のみです。",
    sideIncomePeriod: "期間",
    unspecified: "指定なし",
    leaveParentLabel: "産休・育休",
    leaveParentNone: "なし",
    leaveParentHusband: "本人",
    leaveParentWife: "配偶者",
    leaveExtensionYears: "延長育休",
    leaveExtensionYearsUnit: "年",
    leaveHelp:
      "対象(本人・配偶者)を選ぶと、出生年の収入が65%として計算されます。延長育休に年数を入れると、その年数分は収入0%として計算されます(基本の65%が優先)。",
    cohabitation: "同棲",
    cohabitationStartYear: "同棲開始年",
    cohabitationHelp:
      "この年から配偶者の収入と「暮らし(同棲後)」が反映されます。それより前は配偶者の収入は0円、暮らしは「同棲前」の内容が使われます。",
    moveInBonus: "同棲時の一時収入",
    moveInBonusHelp: "同棲開始年に一度だけ収入として加算されます(例: 相手が共通口座に入れる資金)。",
    preCohabitation: "同棲前",
    postCohabitation: "同棲後",
    addLifeItem: "項目を追加",
    newLifeItemLabel: "新しい項目",

    // 設定モーダル: 支出タブ
    inflationRate: "インフレ率",
    inflationUnit: "%/年(暮らし全体)",
    inflationHelp:
      "家賃分の目安: 過去30年平均 約0.5%/年、都心部は1〜2%の上昇も。生活費分の目安: 過去30年平均 約0.5%/年、長期は1〜2%で設計するのが無難。",
    manageCategory: "カテゴリを管理",
    newCategoryName: "新しいカテゴリ名",
    budgetLabel: "予算",
    eventPresetWedding: "結婚式関連費用",
    eventPresetWeddingHelp: "指輪・結婚式・新婚旅行などをまとめて1つの金額で入力してください。",
    eventPresetTravel: "旅行(毎年)",
    travelStartYear: "開始年",

    // 設定モーダル: 貯蓄タブ
    returnRate: "想定利率",
    returnRateUnit: "%/年",
    returnRateHelp:
      "世界株式インデックス長期平均: 5〜7%。国内株式: 3〜5%。債券: 1〜3%。保守的には2〜3%。非課税枠(NISA等)を活かすなら株式型(4〜7%)、生涯投資枠1,800万円を長期で埋めていく戦略が有効。",
    investRatio: "投資に回す比率",
    investRatioUnit: "% (毎月の黒字額に対して)",

    // フッター
    newScenarioPlaceholder: "新しいシナリオ名を入力…",
    editTarget: "編集対象:",

    // カテゴリ予算カード(暮らし)
    scheduleChangeFor: "{name} の変更を予約",
    fromThisMonth: "今月から",
    justAPeriod: "期間限定",
    to: "〜",
    newBudgetPlaceholder: "新しい予算額",
    scheduleHelpPersistent: "その月以降、次の変更を予約するまでずっと適用されます。",
    scheduleHelpPeriod: "その月/期間だけ適用され、過ぎると自動的に元に戻ります。",
    scheduleBtn: "予約する",
    clickToRename: "クリックして名前を変更",
    since: "since {month}",
    from: "from {month}",
    now: "now",
    renewal: "更新料",
    renewalCycle: "年ごと",
    renewalFee: "ヶ月分",

    // シナリオ管理
    selected: "選択中",
    select: "選択",
    rename: "名前を変更",
    deleteLastError: "最後の1件は削除できません",
    delete: "削除",
  },
  en: {
    dashboard: "Dashboard",
    simulation: "Simulation",
    single: "Single",
    compare: "Compare",
    yearly: "Yearly",
    monthly: "Monthly",
    table: "Table",
    graph: "Graph",
    totalIncome: "Total income",
    totalExpense: "Total expense",
    totalSavings: "Total savings",
    settingsBtn: "Simulation settings",
    scenarios: "Scenarios",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    save: "Save",
    close: "Close",
    apply: "Apply to current",
    cancel: "Cancel",
    addScenario: "Save as new scenario",
    life: "Life",
    education: "Education",
    events: "Events",
    fixed: "Fixed",
    variable: "Variable",
    cash: "Cash",
    invest: "Invest",
    profit: "Profit",
    husband: "Your salary",
    wife: "Spouse salary",
    side: "Side income",
    childAllowance: "Child allowance",
    yearsAheadLabel: "In {n} yr",
    family: "Family",
    income: "Income",
    spending: "Spending",
    savingsTab: "Savings",
    overview: "Overview",
    incomeBreakdown: "Income breakdown",
    lifeBreakdown: "Life breakdown",
    educationBreakdown: "Education breakdown",
    eventsBreakdown: "Events breakdown",
    expenseTotal: "Total expense",
    savingsBreakdown: "Savings breakdown",

    spouse: "Spouse",
    spouseYes: "Yes",
    spouseNo: "No",
    children: "Children",
    addChild: "Add a child",
    birthYear: "Birth year",
    ageThisYear: "(turns {age} this year)",

    husbandIncome: "Your take-home",
    wifeIncome: "Spouse take-home",
    netMonthly: "Monthly",
    netBonus: "Bonus (annual)",
    yenPerMonth: "¥/mo",
    yenPerYear: "¥/yr",
    raisePerYear: "%/yr raise",
    sideIncome: "Side income",
    grossAnnualNote: "Gross annual income: {amount}/yr",
    publicAllowance: "Public allowance",
    publicAllowanceDetail: "Ages 0-2: ¥15,000/mo, ages 3-high school: ¥10,000/mo (auto-calculated)",
    netIncomeHelp:
      "Enter your take-home pay after tax/social insurance. Gross annual income is auto-calculated as (monthly×12 + bonus) ÷ 0.8, shown for reference only.",
    sideIncomePeriod: "Period",
    unspecified: "Unset",
    leaveParentLabel: "Parental leave",
    leaveParentNone: "None",
    leaveParentHusband: "You",
    leaveParentWife: "Spouse",
    leaveExtensionYears: "Extended leave",
    leaveExtensionYearsUnit: "yr",
    leaveHelp:
      "Choosing a parent (you/spouse) sets that parent's income to 65% in the birth year. Adding extended-leave years sets income to 0% for that many years after (the 65% base takes priority).",
    cohabitation: "Cohabitation",
    cohabitationStartYear: "Cohabitation start year",
    cohabitationHelp:
      "From this year on, spouse income and \"Life (post-cohabitation)\" apply. Before it, spouse income is ¥0 and \"Life (pre-cohabitation)\" is used instead.",
    moveInBonus: "One-time move-in income",
    moveInBonusHelp: "Added once, in the cohabitation start year (e.g. funds your partner puts into the joint account).",
    preCohabitation: "Pre-cohabitation",
    postCohabitation: "Post-cohabitation",
    addLifeItem: "Add item",
    newLifeItemLabel: "New item",

    inflationRate: "Inflation rate",
    inflationUnit: "%/yr (whole Life budget)",
    inflationHelp:
      "Rent guide: ~0.5%/yr over the last 30 years, up to 1-2%/yr in central areas. Cost-of-living guide: ~0.5%/yr over the last 30 years; 1-2%/yr is a safe long-term assumption.",
    manageCategory: "Manage categories",
    newCategoryName: "New category name",
    budgetLabel: "Budget",
    eventPresetWedding: "Wedding-related costs",
    eventPresetWeddingHelp: "Enter one combined amount covering the ring, ceremony, honeymoon, etc.",
    eventPresetTravel: "Travel (annual)",
    travelStartYear: "From",

    returnRate: "Expected return",
    returnRateUnit: "%/yr",
    returnRateHelp:
      "Global equity index, long-term average: 5-7%. Domestic equities: 3-5%. Bonds: 1-3%. Conservative: 2-3%. To use tax-free allowances (e.g. NISA), an equity-heavy allocation (4-7%) filling the ¥18M lifetime limit over time tends to work well.",
    investRatio: "Invested share",
    investRatioUnit: "% (of each month's surplus)",

    newScenarioPlaceholder: "Enter a new scenario name…",
    editTarget: "Editing:",

    scheduleChangeFor: "Schedule a change for {name}",
    fromThisMonth: "From this month",
    justAPeriod: "Just a period",
    to: "to",
    newBudgetPlaceholder: "New budget",
    scheduleHelpPersistent: "Applies from that month onward, until you schedule another change.",
    scheduleHelpPeriod: "Applies only for that month/period, then reverts automatically.",
    scheduleBtn: "Schedule",
    clickToRename: "Click to rename",
    since: "since {month}",
    from: "from {month}",
    now: "now",
    renewal: "Renewal",
    renewalCycle: "yr cycle",
    renewalFee: "mo. fee",

    selected: "Selected",
    select: "Select",
    rename: "Rename",
    deleteLastError: "You can't delete the last one",
    delete: "Delete",
  },
} as const;

export type DictKey = keyof (typeof DICT)["ja"];

export function t(lang: Lang, key: DictKey): string {
  return DICT[lang][key] ?? key;
}

// {placeholder} 形式のテンプレートに値を埋め込む(数量・金額など、辞書だけでは
// 表現できない文言向け)。
export function tf(lang: Lang, key: DictKey, values: Record<string, string | number>): string {
  let out = t(lang, key);
  for (const [k, v] of Object.entries(values)) {
    out = out.replace(`{${k}}`, String(v));
  }
  return out;
}

// カテゴリ名(英語、piggybank.categories.name)の日本語表示ラベル。
// 未知のカテゴリはそのまま返す。
const CAT_JA: Record<string, string> = {
  "Home Cooking": "自炊",
  "Dining Out": "外食",
  Cafe: "カフェ",
  "AI/SaaS": "AI・SaaS",
  "Online Shopping": "ネット通販",
  Supplement: "サプリ",
  "Sauna/Spa": "サウナ・スパ",
  Fashion: "ファッション",
  Transport: "交通費",
  Other: "その他",
  Travel: "旅行",
  Rent: "住居",
  Insurance: "保険料",
  Medical: "医療費",
};

export function catLabel(lang: Lang, name: string): string {
  return lang === "ja" ? (CAT_JA[name] ?? name) : name;
}
