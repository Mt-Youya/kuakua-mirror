# 修复 Maven Wrapper 问题

## 问题描述

执行 `./mvnw clean install` 时出现错误：
```
错误: 找不到或无法加载主类 org.apache.maven.wrapper.MavenWrapperMain
原因: java.lang.ClassNotFoundException: org.apache.maven.wrapper.MavenWrapperMain
```

这是因为 `.mvn/wrapper/maven-wrapper.jar` 文件缺失。

## 解决方案

### 方案 1：重新生成 Maven Wrapper（推荐）

如果你的机器上已安装 Maven：

```bash
cd /Users/yonjay/codes/hubs/kuakua-mirror/backend

# 删除现有的 wrapper
rm -rf .mvn/wrapper
rm mvnw mvnw.cmd

# 重新生成 wrapper
mvn wrapper:wrapper
```

### 方案 2：手动下载 maven-wrapper.jar

在可以访问外网的环境中：

```bash
cd /Users/yonjay/codes/hubs/kuakua-mirror/backend

# 下载 maven-wrapper.jar
curl -o .mvn/wrapper/maven-wrapper.jar \
  https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar

# 或者使用 wget
wget -O .mvn/wrapper/maven-wrapper.jar \
  https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar
```

### 方案 3：安装系统 Maven

使用 Homebrew 安装 Maven：

```bash
brew install maven
```

然后直接使用 `mvn` 命令：

```bash
cd /Users/yonjay/codes/hubs/kuakua-mirror/backend
mvn clean install
mvn spring-boot:run
```

### 方案 4：使用 IDE

推荐使用 IntelliJ IDEA：

1. 打开 IntelliJ IDEA
2. File → Open → 选择 `backend` 目录
3. IDE 会自动识别为 Maven 项目
4. IDE 会自动下载依赖
5. 右键 `MirrorApplication.java` → Run

## 验证修复

修复后运行：

```bash
cd /Users/yonjay/codes/hubs/kuakua-mirror/backend
./mvnw clean compile
```

应该看到：
```
[INFO] BUILD SUCCESS
```

## 环境要求

- Java 21 或更高版本
- Maven 3.9+ 或 Maven Wrapper
- 网络访问 Maven Central 仓库

## 检查 Java 版本

```bash
java -version
# 应该显示 java version "21.x.x" 或更高
```

如果 Java 版本不对，设置 JAVA_HOME：

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH
```
