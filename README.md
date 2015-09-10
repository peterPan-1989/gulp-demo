## 使用方法
### 安装相关的依赖</br>
	1. sudo npm install
	2. bower install
	3. npm install -g gulp
	如果出现npm过慢问题，推荐参考文章 <http://www.cnblogs.com/trying/p/4064518.html>
	bower过慢问题，推荐参考文章 <http://segmentfault.com/a/1190000002435496>

### 生成开发环境代码</br>
	gulp

### 生成生产环境代码</br>
	gulp pro


## 注意事项

### 目录结构与文件命名

1. src/modules/*/{css|html}/*，也就是模块中的每个css和html目录下的文件不存在目录层级，即全部放在同一层级，如index模块(modules/index/css/*.less)，里面的less文件全部放到modules/index/css目录下，不能在新建目录如modules/index/css/xxx。如果要存在多层级关系，可以通过命名限定，如index.less，index.header.less，index.main.less，在最终的输出时css文件全部输出到output/css/*.css，输出目录不存在二级目录，全部同层级关系。

2. 谨记模块的文件的命名不能与全局目录下的文件命名冲突。如存在src/css/win.less这样一个文件，那么就不要存在一个modules/win/css/win.less
这个的结构，因为最终输出目录会将所有css文件放到同一层级。

3. img，js目录可分层级。如modules/index/img/xxx/a.png，到最终输出位置为output/img/xxx/a.png。

### 模版与数据绑定

1. html模版编写完以后，在对应的层级的目录下找到data目录并且对应html的名字编写模版的对应数据结构。数据文件用nodejs解释，可以放json格式或者js函数，
并且可以引用其他的数据文件进行继承

2. 每个模版都有一个预处理模版语言，与volecity模版是区分来的，用于对模版在输出的时候做一个处理，主要用于对不同环境的处理，如

	&lt;!-- @if NODE_ENV='pro' --&gt;</br>
&lt;script type="text/javascript" src="${rootPath}/js/index/index.js">&lt;/script&gt;</br>
&lt;!-- @endif --&gt;

	上面这段代码用于对pro模式的js入口文件的旋转。

### requirejs的配置
1. 每个页面都有一个对应本页面的js入口文件，我们要做的是对该文件需要压缩。由于js的格式amd模式，所以我们要利用进行r.js压缩。对于每个入口文件的配置，
我们放在每个模块下的jsConfig.js下，该文件用nodejs解释，可以放json或cmd模式的js。
配置的参数主要有name,include,exclude

2. name是指文件的入口路径，如"index/aaa/ddd",是相对于baseUrl下的一个路径，如baseUrl路径为js,那最终路径为js/index/aaa/ddd.js。

3. include是动态依赖的js模块，因为在js文件里面可能存在一些动态引用模块，如直接调用require()。那么需要自己手动在include添加自己的模块路径，也是相对
于baseUrl。

4. exclude是为了提取common的js文件的需求存在的，在exclude里面配置相关的js文件，那么每个模块压缩的时候就会从exclude里面解释是否已经存在，存在的模块
就不进行引入。

### jsLib的配置
1. js的lib包我们用bower管理，通过配置，我们的jsLib全部都放在代码目录下的lib目录中，但是在生成最终文件的过程中我们不会全部复制到output目录中，仅通过配置转移需要的js或某个目录。配置文件在src/jsLibConfig.js中。


## 完成进度
* volecity模版解释 ok</br>
* img压缩 ok</br>
* less解释和css压缩 ok</br>
* requirejs ok</br>
* requirejs min ok</br>
* requirejs 公用抽离 ok</br>
* globaljs合并 将require.js和其他commonjs文件合并，可动态配置 ok
* css sprite</br>
* inline 把css，js inline进去html里面</br>
* 对文件路径加md5</br>
* watch监听 ok</br>

