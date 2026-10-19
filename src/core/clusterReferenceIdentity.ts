/** Fixed compact-catalog record identity;dataset-specific membership is checked against the admitted source. */
export const CLUSTER_REFERENCE_ID_PATTERN=/^([NS])(0000|0730|1500|2230|3000|3730|4500|5230|6000|6730|7500|8230)\.DAT@[0-9]+$/;
export function isClusterReferenceId(value:unknown):value is string{return typeof value==='string'&&value.length<=40&&CLUSTER_REFERENCE_ID_PATTERN.test(value);}
