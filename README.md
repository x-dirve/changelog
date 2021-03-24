# Changelog 生成模块

通过使用 git log 命令获取提交记录并通过特征提取符合规则的记录生成项目 Changelog。因此需要使用该模块的仓库在提交 commit 的时候依照具体情况在 commit 前加入相应的 commit 类型。

目前支持记录的类型有 `feat` `fix` `perf` `refactor`
* feat: 新功能、新特性
* fix: 修改 bug
* perf: 更改代码，以提高性能
* refactor: 代码重构

如 `CHANGELOG.md` 文件已存在，模块会将内容追加到文件头部

```javascript
git log --no-merges --pretty=format:'%s [%h](${repositoryUrl}/commit/%H)' --abbrev-commit --date=relative
```

## 配置
>目前只支持有 `package.json` 声明的项目

以下字段都在 `package.json` 文件中配置
- `version` package.json 中声明项目版本的字段，该字段没配置会报错
- `changelog` 模块配置字段
    - `url` 项目仓库地址，该地址没配置会尝试查找文件中 `repository` 字段中的 `url` 字段并处理成能用的数据
    - `text` 提交类型显示文本映射配置对象，目前支持 `feat` `fix`。该字段没配置时会显示类型名称 

## 使用

- 提交的 commit 至少有一条是以 `feat:` 或 `fix:` 开头的
- `package.json` 的 scripts 字段中增加对应的运行命令，如
    ```json
    "changelog": "changelog"
    ```
- 运行 npm 命令，如
    ```sh
    npm run changelog
    ```