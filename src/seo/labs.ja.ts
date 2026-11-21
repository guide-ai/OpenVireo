/** Front JA-REL+SEO [W]: the Japanese (ja) texts of the seven lab pages under /ja/labs/ (user decision 8 of 2026-11-09 and the
 * Japanese decisions settled on 2026-11-19, AGENTS.md). Same slugs and order as src/seo/labs.ts; です/ます in sentences, nouns in
 * names and headings, no second-person pronoun, following the ja glossary (src/i18n/ja/glossary.json; «実習» for a lab) and the ja
 * lint profile with its typography (full-width 。、：？（） next to Japanese, no space between Japanese and Latin text or digits;
 * src/seo/languages.test.ts checks both). The lab names are the app's own Japanese names (home.hubble … home.objectX of
 * src/i18n/ja/ja.json). A web adaptation by OpenVireo of its own English pages: never CLEA's text, and it claims no equivalence
 * with the original program. */
import type {LabText} from './labs.ts';
import type {LabSlug} from './labSlugs.ts';

export const LAB_TEXT_JA:Readonly<Record<LabSlug,LabText>>=Object.freeze({
 hubble:{name:'ハッブルの法則',
  title:'ハッブルの法則をオンラインで学ぶCLEA VIREOの実習 · OpenVireo',
  description:'仮想の望遠鏡と分光器で銀河の赤方偏移を測り、ハッブルの法則を自分で当てはめます。CLEA VIREOのハッブル実習を再構築した無料のWeb版です。',
  heading:'ハッブルの法則：赤方偏移と距離の関係',
  intro:'元のVIREOのハッブル実習に登場する銀河に仮想の望遠鏡を向け、スペクトルを取得して、スペクトル線がどれだけずれているかを測ります。自分の測定からハッブル図を作り、宇宙の膨張率を見積もります。',
  steps:['元の実習リストにある13個の銀河に1つずつ望遠鏡を向け、スペクトルを取得します。','スペクトル解析ツールでカルシウムのK線・H線とGバンドの位置を合わせ、それぞれの赤方偏移を測ります。','各赤方偏移を後退速度に換算し、等級から求めた銀河の距離と組み合わせます。','速度を距離に対してプロットし、ハッブルの関係を自分で当てはめて、調査を保存します。'],
  learn:['スペクトルが銀河の運動を明かす仕組み','ハッブル定数の意味と、その測り方','天文学者が距離の見積もりに標準光源を使う理由']},
 'large-scale-structure':{name:'大規模構造',
  title:'宇宙の大規模構造を調べるCLEA VIREOの実習 · OpenVireo',
  description:'空の帯状領域をサーベイし、多くの銀河の赤方偏移を測って、宇宙の網の目構造を扇形図に描きます。CLEA VIREOのLSS実習を再構築した無料のWeb版です。',
  heading:'宇宙の大規模構造',
  intro:'元の9つのサーベイ視野から1つを選び、銀河の赤方偏移を次々に測って、扇形図にプロットします。自分のデータの中に、ウォール、フィラメント、ボイドが現れます。',
  steps:['サーベイ視野と望遠鏡を選びます。','各銀河のスペクトルを取得し、赤方偏移を記録します。','自分の記録を、赤経と速度の扇形図にプロットします。','見えた構造を説明し、調査を保存します。'],
  learn:['赤方偏移サーベイで宇宙を3次元の地図にする方法','銀河団、ウォール、フィラメント、ボイドとは何か','扇形図の読み方']},
 'stellar-classification':{name:'恒星のスペクトル分類',
  title:'恒星のスペクトル分類を学ぶCLEA VIREOの実習 · OpenVireo',
  description:'恒星のスペクトル分類を学びます。スペクトルを標準星と比べ、スペクトル線に印を付けて等価幅を測ります。CLEA VIREOの実習を再構築した無料のWeb版です。',
  heading:'恒星スペクトルの分類',
  intro:'恒星のスペクトル分類を自分で試せます。元の25個の練習用スペクトルから1つを読み込み、標準星のアトラスと比べます。見えた線からスペクトル型を自分で決めます。採点はなく、答えが明かされることもありません。',
  steps:['練習用のスペクトルと、標準スペクトルのアトラスを読み込みます。','並べて表示するか差を取って、近いスペクトル型の標準星と比べます。','線の表からスペクトル線に印を付け、等価幅を測ります。','自分で決めたスペクトル型とその根拠を記録し、調査を保存します。'],
  learn:['OBAFGKMのスペクトル系列と、それを決めるもの','高温の星と低温の星を見分ける吸収線','スペクトルを標準星と客観的に比べる方法']},
 pleiades:{name:'プレアデス測光',
  title:'プレアデス星団を測光するCLEA VIREOの実習 · OpenVireo',
  description:'仮想の測光器でプレアデス星団の星のB・Vの明るさを測り、星団までの距離を見積もります。CLEA VIREOの実習を再構築した無料のWeb版です。',
  heading:'プレアデス星団の光電測光',
  intro:'元の実習リストにあるプレアデス星団の24個の星に望遠鏡を向け、仮想の測光器でB・Vのフィルターを通して1つずつ測ります。自分の読み取り値から星団の系列をプロットし、その距離を見積もります。',
  steps:['プレアデス星団のリストを読み込み、望遠鏡を星に向けます。','B・Vのフィルターを通して、空の明るさと星の明るさを測ります。','読み取り値を記録し、各星の色指数B−Vを求めます。','主系列を手で当てはめて距離を見積もり、調査を保存します。'],
  learn:['測光で星の明るさと色を測る仕組み','色等級図からわかること','主系列の当てはめから星団の距離がわかる仕組み']},
 'cluster-hr':{name:'星団のHR図',
  title:'星団のHR図を描くCLEA VIREOの実習 · OpenVireo',
  description:'星団のHR図を描いて主系列を当てはめ、自分で測ったプレアデス星団のデータと比べます。CLEA VIREOの実習を再構築した無料のWeb版です。',
  heading:'さまざまな星団のHR図',
  intro:'インタラクティブなHR図で、データベースから参照星団を選んでプロットし、主系列を当てはめて、測光の実習で自分が測ったプレアデス星団の星と比べます。',
  steps:['データベースから参照星団を選び、そのHR図をプロットします。','主系列を当てはめます。','自分で測ったプレアデス星団のB・Vの測定値をプロットします。','2つの系列を自分で比べます。'],
  learn:['ヘルツシュプルング・ラッセル図（HR図）の作り方','星団の図が距離と年齢を明かす仕組み','塵による赤化で星団が図の中でずれる理由']},
 pulsars:{name:'パルサー',
  title:'パルサーの電波天文学を学ぶCLEA VIREOの実習 · OpenVireo',
  description:'仮想の電波望遠鏡でパルサーを2つの周波数で記録し、周期と分散量度を測ります。CLEA VIREOのパルサー実習を再構築した無料のWeb版です。',
  heading:'パルサーの電波天文学',
  intro:'仮想の電波望遠鏡を元のカタログのパルサーに向け、2つの電波の周波数でパルスを記録します。2つの周波数でのパルスの到着時刻のずれは、信号が通り抜けた星間物質の量を明かします。',
  steps:['パルサー実習を開始し、電波望遠鏡をパルサーに向けます。','2つの異なる周波数でパルスを記録します。','周期と、周波数の間の遅れを測ります。','自分の結果を分散量度（DM）や周期の値と比べ、調査を保存します。'],
  learn:['パルサーとは何か、なぜパルスを出すのか','分散によって低い周波数の電波信号が遅れる仕組み','分散量度からパルサーの距離を見積もれる理由']},
 'object-x':{name:'天体X',
  title:'天体X：謎の天体の正体を突き止めるCLEA VIREOの実習 · OpenVireo',
  description:'座標だけを手がかりに、画像、スペクトル、電波で天体Xが恒星、銀河、クエーサー、パルサー、小惑星のどれかを見極めます。CLEAの実習を再構築した無料のWeb版です。',
  heading:'天体X：その正体は？',
  intro:'手がかりは識別子と座標だけです。異なる時刻に撮ったCCD画像、スペクトル、電波望遠鏡を使って、その天体が恒星、銀河、クエーサー、パルサー、小惑星のどれなのかを判断します。',
  steps:['目標を識別子と座標だけで受け取ります。正体は伏せられたままです。','CCDカメラ、分光器、電波望遠鏡で観測します。','どの種類の天体かを判断し、自分の観測で根拠を示します。','小惑星なら、複数の画像でその位置を測り、動きを説明します。'],
  learn:['さまざまな種類の天体が、画像、スペクトル、電波でどう見えるか','画像の間での動きが、太陽系の天体であることを明かす仕組み','複数の種類の証拠から論証を組み立てる方法']},
});
