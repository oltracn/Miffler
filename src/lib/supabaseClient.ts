// 从 @supabase/supabase-js 导入 createClient 函数，用于创建 Supabase 客户端实例
import { createClient } from '@supabase/supabase-js';
// 从 @env 导入 Supabase 的 URL 和匿名密钥，这些是存储在 .env 文件中的环境变量
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
// 导入我们创建的跨平台统一存储适配器
import { universalStore } from '../../utils/universalStore';

// 检查环境变量是否已定义
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // 如果环境变量未设置，则抛出错误。
  // 这可以防止应用在无效的 Supabase 配置下运行。
  // 请确保在 Miffler 项目的根目录下有一个 .env 文件，并包含这些值。
  throw new Error('SUPABASE_URL 和 SUPABASE_ANON_KEY 必须在您的 .env 文件中定义');
}

// 创建并导出 Supabase 客户端实例
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  // 配置认证相关的选项
  auth: {
    // 指定使用我们创建的 universalStore 作为存储机制。
    // 它会根据平台自动选择 SecureStore (原生) 或 localStorage (Web)。
    storage: universalStore,
    // 自动刷新 token。当 access token 过期时，客户端会自动使用 refresh token 获取新的 token。
    autoRefreshToken: true,
    // 持久化 session。这样即使用户关闭并重新打开应用，也能保持登录状态。
    persistSession: true,
    // 不在 URL 中检测 session。这对于移动应用的 OAuth 流程非常重要，可以防止一些重定向问题。
    detectSessionInUrl: false,
  },
});
