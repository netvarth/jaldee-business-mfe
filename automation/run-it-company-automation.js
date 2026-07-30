/**
 * Complete IT-company automation.
 *
 * Creates a brand-new tenant, provisions 25 employees, and delegates the
 * complete positive/negative enterprise workflow to the maintained enterprise
 * automation. Every value remains overridable through environment variables.
 */
process.env.ENTERPRISE_FORCE_NEW_ACCOUNT = "true";
process.env.ENTERPRISE_LOGIN_ID ||= "dharsh005";
process.env.ENTERPRISE_PASSWORD ||= "dhyanDarsh@1";
process.env.ENTERPRISE_EMPLOYEE_COUNT ||= "25";
process.env.ENTERPRISE_DATA_SUFFIX ||= "IT25";
process.env.ENTERPRISE_PHONE ||= "5555000025";
process.env.ENTERPRISE_COMPANY_NAME ||= "Dhyan Darsh IT Private Solutions005";
process.env.ENTERPRISE_EMAIL_DOMAIN ||= "jaldee.com";
process.env.ENTERPRISE_PHONE_PREFIX ||= "5555";

console.log(`IT company login: ${process.env.ENTERPRISE_LOGIN_ID}`);
console.log(`IT company password: ${process.env.ENTERPRISE_PASSWORD}`);

require("./run-enterprise-automation");
