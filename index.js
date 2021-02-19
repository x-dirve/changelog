const { readFileSync, openSync, writeFileSync, closeSync } = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");
const { resolve } = require("path");
const chalk = require("chalk");

const execute = promisify(exec);

/**提交类型判断正则 */
const FEATURE_REGEXP = /^(feat|fix)[\s]?\:/;

/**模块名称 */
const MOD_NAME = chalk.blue("[CHANGELOG]");

/**
 * 从项目 package.json 文件中获取相关设置
 * @returns {{version:string, url:string, text:{feat?:string, fix?:string}}}
 */
function getSettingAtPackageJsonFile() {
    const filePath = resolve(
        process.cwd(), "package.json"
    );
    try {
        const meta = readFileSync(filePath, "utf8");
        const { version, changelog, repository } = JSON.parse(meta);

        const conf = {
            // 当前版本
            version
            // 仓库 url
            , "url": changelog && changelog.url || null
            // 特征对应的显示文本
            , "text": changelog && changelog.text || null
        };

        if (!conf.url && repository && repository.url) {
            conf.url = repository.url.replace(/\.?git\+?/g, "");
        }

        if (!conf.url || !/^http/.test(conf.url)) {
            console.log(
                MOD_NAME
                , chalk.underline.red("Error")
                , "缺少有效的仓库地址，请在项目 package.json 文件中增加 changelog 相关配置项"
            );
            return null;
        }

        return conf;
    } catch(err) {
        console.log(
            MOD_NAME
            , chalk.underline.red("Error")
            , err.message
        );
        return null;
    }
}

/**
 * 保存生成的 changelog
 * @param {String} data    待保存数据
 * @param {String} version 当前版本
 */
function saveChangelog(data, version) {
    const changelogFilePath = resolve(
        process.cwd()
        , "CHANGELOG.md"
    );
    var fd;
    // 操作结果
    var re;
    // 版本判断正则
    const versionRegexp = new RegExp(`^##\\sv${version}`);
    // 已有的数据
    var nowLog;

    try {
        fd = openSync(changelogFilePath, "r+");
        nowLog = readFileSync(changelogFilePath, "utf8");
        if (versionRegexp.test(nowLog)) {
            console.log(
                MOD_NAME
                , chalk.underline.yellow("Warning")
                , `当前文件已存在 v${version} 的记录`
            );
        }
    } catch(err) {
        nowLog = ""
    }

    try {
        writeFileSync(changelogFilePath, `${data}\n\n${nowLog}`, "utf8");
        nowLog = null;
        re = true;
    } catch (err) {
        console.log(
            MOD_NAME
            , chalk.underline.red("Error")
            , err.message
        );
        re = false
    } finally {
        if (fd !== undefined) {
            closeSync(fd);
        }
    }
    return re;
}

/**
 * 获取显示标题
 * @param {String} key 特征名称
 * @param {Object} map 特征名称显示用文本映射对象
 */
function getTitle(key, map) {
    var title = map && map[key] || "";
    if (!title) {
        title = key.replace(/^[a-z]/, function(m) {
            return m.toUpperCase();
        });
    }
    return title;
}

/**
 * 获取显示 git log 的命令
 * @param {String} repository 仓库地址
 */
function getCommand(repository) {
    repository = repository.replace(/\/$/, "");
    return `git log --no-merges --pretty=format:'%s [%h](${repository}/commit/%H)' --abbrev-commit --date=relative`;
}

async function build() {
    console.log(
        MOD_NAME
        , chalk.underline.cyan("Starting")
        , "开始生成 changelog"
    );
    try {
        const conf = getSettingAtPackageJsonFile();
        if (!conf) {
            // TODO:
            // 支持传参，不强制使用 package.json
            return;
        }

        if (!conf.version) {
            // TODO:
            // 支持 tag?
            console.log(
                MOD_NAME
                , chalk.underline.red("Error")
                , "找不到版本字段，请在 package.json 中配置 version 字段"
            );
            return;
        }

        const { stdout, stderr } = await execute(
            getCommand(conf.url)
        );

        if (stderr) {
            console.log(
                MOD_NAME
                , chalk.underline.red("Error")
                , stderr
            );
            return;
        }

        if (stdout) {
            console.log(
                MOD_NAME
                , chalk.underline.cyan("Building")
                , "获取记录成功，正在创建"
            );

            const logs = stdout.split("\n").reduce(
                (subject, line) => {
                    if (FEATURE_REGEXP.test(line)) {
                        const type = line.match(FEATURE_REGEXP)[1];
                        if (!subject[type]) {
                            subject[type] = [];
                        }
                        subject[type].push(`- ${line}`);
                    }
                    return subject;
                }
                ,Object.create(null)
            );
            const changeLog = Object.keys(logs).reduce(
                (logArr, type) => {
                    logArr.push(`\n### ${getTitle(type, conf.text)}`);
                    logArr = logArr.concat(logs[type]);
                    return logArr;
                }
                , [`## v${conf.version}`]
            ).join("\n");

            const re = saveChangelog(changeLog, conf.version);

            console.log(
                MOD_NAME
                , chalk.underline[re ? "green" : "red"](re ? "Success" : "Failed")
                , `创建${re ? "成功" : "失败"}`
            );
        }
    } catch(err) {
        console.log(
            MOD_NAME
            , chalk.underline.red("Error")
            , err.message
        );
    }
}

module.exports = build;

if (!module.parent) {
    // 直接调用
    build();
}
