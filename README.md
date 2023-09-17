# Nest-QCloud-COS

## 简介
基于腾讯云COS的NestJS中间件，实现简单文件上传至腾讯云COS.

## Installation

    npm install nestjs-qcloud-cos
    或
    yarn add nestjs-qcloud-cos

## Quick Start

配置文件上传模块

```js
import * as QCloudCos from 'nestjs-qcloud-cos';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        storage: QCloudCos({
          cos: {
            SecretId: configService.get('COS_SECRET_ID'),
            SecretKey: configService.get('COS_SECRET_KEY'),
            Bucket: configService.get('COS_BUCKET_NAME'),
            Region: configService.get('COS_BUCKET_REGION'),
            // 以下为可选参数
            domainProtocol: configService.get('COS_DOMAIN_PROTOCOL'), //自定义域名协议, 不定义则会使用http
            domain: configService.get('COS_BUCKET_DOMAIN'), // 自定义域名, 不定义则会使用cos默认域名
            dir: configService.get('COS_BUCKET_DIR'), // cos文件路径, 不定义则会上传至bucket的根目录
            onProgress: (progressData) => {
              //进度回调函数，回调是一个对象，包含进度信息
              console.log(progressData);
            },
          },
        }),
      }),
    }),
  ],
})
```

### 调用文件上传

```js
@Controller('storage')
export class StorageController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log(file);
    return file;
  }
}
```

### 调用返回数据
```json
{
    "fieldname": "file",
    "originalname": "logo.png",
    "encoding": "7bit",
    "mimetype": "image/png",
    "filename": "files/402b91a330e7dda1c00edc52a83b10b7.png",
    "url": "https://file-12384350.cos.ap-guangzhou.myqcloud.com/files/402b91a330e7dda1c00edc52a83b10b7.png"
}
```

### 其他说明

中间件使用了dotenv读取配置文件变量,涉及的COS参数需要在腾讯云对象存储获取。


## License

Nest QCloud COS is MIT licensed.

