export const SH_DISTRICTS = [
  { code: "huangpu", cn: "黄浦区", adcode: "310101" },
  { code: "xuhui", cn: "徐汇区", adcode: "310104" },
  { code: "changning", cn: "长宁区", adcode: "310105" },
  { code: "jingan", cn: "静安区", adcode: "310106" },
  { code: "putuo", cn: "普陀区", adcode: "310107" },
  { code: "hongkou", cn: "虹口区", adcode: "310109" },
  { code: "yangpu", cn: "杨浦区", adcode: "310110" },
  { code: "minhang", cn: "闵行区", adcode: "310112" },
  { code: "baoshan", cn: "宝山区", adcode: "310113" },
  { code: "jiading", cn: "嘉定区", adcode: "310114" },
  { code: "pudong", cn: "浦东新区", adcode: "310115" },
  { code: "jinshan", cn: "金山区", adcode: "310116" },
  { code: "songjiang", cn: "松江区", adcode: "310117" },
  { code: "qingpu", cn: "青浦区", adcode: "310118" },
  { code: "fengxian", cn: "奉贤区", adcode: "310120" },
  { code: "chongming", cn: "崇明区", adcode: "310151" },
];

export function findDistrict(input: string) {
  return SH_DISTRICTS.find(
    (d) => d.code === input || d.cn === input || d.adcode === input
  );
}
