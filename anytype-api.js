/**
 * Anytype API 服务模块
 * 处理与 Anytype 本地 API 的所有交互
 */

export class AnytypeAPI {
  constructor() {
    this.baseURL = 'http://localhost:31009/v1';
    this.apiVersion = '2025-05-20';
    this.appName = 'PerplexityClipper';
    console.log('🔧 AnytypeAPI 初始化:', {
      baseURL: this.baseURL,
      apiVersion: this.apiVersion,
      appName: this.appName
    });
  }

  /**
   * 获取请求头
   */
  async getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
      'Anytype-Version': this.apiVersion
    };

    if (includeAuth) {
      const apiKey = await this.getStoredApiKey();
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    console.log('📋 请求头:', headers);
    return headers;
  }

  /**
   * 获取存储的 API Key
   */
  async getStoredApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['anytype_api_key'], (result) => {
        resolve(result.anytype_api_key);
      });
    });
  }

  /**
   * 保存 API Key
   */
  async saveApiKey(apiKey) {
    console.log('💾 保存 API Key:', apiKey ? '***存在***' : 'null');
    return new Promise((resolve) => {
      chrome.storage.local.set({ anytype_api_key: apiKey }, resolve);
    });
  }

  /**
   * 获取存储的 API Key（异步版本）
   */
  async getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['anytype_api_key'], (result) => {
        const apiKey = result.anytype_api_key;
        console.log('🔑 获取到的 API Key:', apiKey ? '***存在***' : '未找到');
        resolve(apiKey);
      });
    });
  }

  /**
   * 检查 Anytype 是否在运行
   */
  async checkAnytypeRunning() {
    console.log('🔍 检查 Anytype 运行状态...');
    console.log('📡 尝试连接:', `${this.baseURL}/health`);
    
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Anytype-Version': this.apiVersion
        }
      });
      
      console.log('🌐 Health check 响应状态:', response.status);
      console.log('✅ Health check 响应 OK:', response.ok);
      
      if (response.ok) {
        const data = await response.text();
        console.log('📋 Health check 响应内容:', data);
      }
      
      return response.ok;
    } catch (error) {
      console.error('❌ Health check 失败:', error);
      console.error('🔍 错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * 启动配对流程 - 第一步：请求挑战
   */
  async startPairing() {
    console.log('🚀 启动配对流程...');
    const url = `${this.baseURL}/auth/challenges`;
    console.log('📡 配对请求 URL:', url);
    
    const requestBody = { app_name: this.appName };
    console.log('📤 配对请求体:', requestBody);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: await this.getHeaders(false),
        body: JSON.stringify(requestBody)
      });

      console.log('🌐 配对请求响应状态:', response.status);
      console.log('✅ 配对请求响应 OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 配对请求失败响应:', errorText);
        throw new Error(`配对请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📋 配对响应完整数据:', data);
      
      // 根据参考代码，challenge_id 可能在 id 或 challenge_id 字段中
      const challengeId = data.id || data.challenge_id;
      console.log('🎯 提取的 Challenge ID:', challengeId);
      
      if (!challengeId) {
        console.error('❌ 未找到 Challenge ID，响应数据:', data);
        throw new Error('未找到 Challenge ID');
      }
      
      console.log('✅ 配对挑战已发起，Challenge ID:', challengeId);
      return challengeId;
    } catch (error) {
      console.error('❌ 启动配对失败:', error);
      console.error('🔍 配对错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw new Error('无法连接到 Anytype，请确保应用正在运行。错误: ' + error.message);
    }
  }

  /**
   * 完成配对流程 - 第二步：提交验证码
   */
  async completePairing(challengeId, verificationCode) {
    console.log('🔐 完成配对流程...');
    console.log('🎯 Challenge ID:', challengeId);
    console.log('🔢 验证码:', verificationCode);
    
    const url = `${this.baseURL}/auth/api_keys`;
    console.log('📡 API Key 请求 URL:', url);
    
    const requestBody = {
      challenge_id: challengeId,
      code: verificationCode
    };
    console.log('📤 API Key 请求体:', requestBody);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: await this.getHeaders(false),
        body: JSON.stringify(requestBody)
      });

      console.log('🌐 API Key 请求响应状态:', response.status);
      console.log('✅ API Key 请求响应 OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Key 请求失败响应:', errorText);
        
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.warn('⚠️ 无法解析错误响应为 JSON');
        }
        
        throw new Error(errorData.message || `验证失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📋 API Key 响应完整数据:', data);
      
      const apiKey = data.api_key;
      console.log('🔑 提取的 API Key:', apiKey ? '***已获取***' : '未找到');
      
      if (!apiKey) {
        console.error('❌ 未找到 API Key，响应数据:', data);
        throw new Error('未找到 API Key');
      }
      
      // 保存 API Key
      await this.saveApiKey(apiKey);
      console.log('✅ 配对成功，API Key 已保存');
      
      return apiKey;
    } catch (error) {
      console.error('❌ 完成配对失败:', error);
      console.error('🔍 配对完成错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 获取空间列表
   */
  async getSpaces() {
    console.log('📂 获取空间列表...');
    
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('未找到 API Key，请先完成配对');
      }

      const url = `${this.baseURL}/spaces`;
      console.log('📡 空间列表 URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(await this.getHeaders()),
          'Authorization': `Bearer ${apiKey}`
        }
      });

      console.log('🌐 空间列表响应状态:', response.status);
      console.log('✅ 空间列表响应 OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 获取空间列表失败:', errorText);
        throw new Error(`获取空间列表失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📋 空间列表完整数据:', data);
      
      // 修正：从data字段中提取空间列表
      const spaces = data.data || [];
      console.log('📂 提取的空间列表:', spaces);
      
      return spaces;
    } catch (error) {
      console.error('❌ 获取空间列表失败:', error);
      console.error('🔍 空间列表错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 获取指定空间的对象类型列表
   */
  async getObjectTypes(spaceId) {
    console.log('🏷️ 获取对象类型列表...', spaceId);
    
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('未找到 API Key，请先完成配对');
      }

      const url = `${this.baseURL}/spaces/${spaceId}/types`;
      console.log('📡 对象类型 URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(await this.getHeaders()),
          'Authorization': `Bearer ${apiKey}`
        }
      });

      console.log('🌐 对象类型响应状态:', response.status);
      console.log('✅ 对象类型响应 OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 获取对象类型失败:', errorText);
        throw new Error(`获取对象类型失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📋 对象类型完整数据:', data);
      
      // 修正：从data字段中提取类型列表
      const types = data.data || [];
      console.log('🏷️ 提取的对象类型:', types);
      
      return types;
    } catch (error) {
      console.error('❌ 获取对象类型失败:', error);
      console.error('🔍 对象类型错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 获取指定类型的模板列表
   */
  async getTemplates(spaceId, typeId) {
    console.log('📑 获取模板列表...', spaceId, typeId);
    
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('未找到 API Key，请先完成配对');
      }

      const url = `${this.baseURL}/spaces/${spaceId}/types/${typeId}/templates`;
      console.log('📡 模板列表 URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(await this.getHeaders()),
          'Authorization': `Bearer ${apiKey}`
        }
      });

      console.log('🌐 模板列表响应状态:', response.status);
      console.log('✅ 模板列表响应 OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 获取模板列表失败:', errorText);
        throw new Error(`获取模板列表失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📋 模板列表完整数据:', data);
      
      // 从data字段中提取模板列表
      const templates = data.data || [];
      console.log('📑 提取的模板列表:', templates);
      
      return templates;
    } catch (error) {
      console.error('❌ 获取模板列表失败:', error);
      console.error('🔍 模板列表错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 获取模板详情
   */
  async getTemplate(spaceId, typeId, templateId) {
    console.log('📄 获取模板详情...', spaceId, typeId, templateId);
    
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('未找到 API Key，请先完成配对');
      }

      const url = `${this.baseURL}/spaces/${spaceId}/types/${typeId}/templates/${templateId}`;
      console.log('📡 模板详情 URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...(await this.getHeaders()),
          'Authorization': `Bearer ${apiKey}`
        }
      });

      console.log('🌐 模板详情响应状态:', response.status);
      console.log('✅ 模板详情响应 OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 获取模板详情失败:', errorText);
        throw new Error(`获取模板详情失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📋 模板详情完整数据:', data);
      return data;
    } catch (error) {
      console.error('❌ 获取模板详情失败:', error);
      console.error('🔍 模板详情错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 创建新对象
   */
  async createObject(spaceId, objectData) {
    console.log('📝 创建新对象...', spaceId);
    console.log('📤 对象数据:', objectData);
    
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('未找到 API Key，请先完成配对');
      }

      const url = `${this.baseURL}/spaces/${spaceId}/objects`;
      console.log('📡 创建对象 URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(await this.getHeaders()),
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(objectData)
      });

      console.log('🌐 创建对象响应状态:', response.status);
      console.log('✅ 创建对象响应 OK:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 创建对象失败:', errorText);
        
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.warn('⚠️ 无法解析创建对象错误响应为 JSON');
        }
        
        throw new Error(errorData.message || `创建对象失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📋 创建对象完整响应:', data);
      console.log('✅ 对象创建成功！');
      
      return data;
    } catch (error) {
      console.error('❌ 创建对象失败:', error);
      console.error('🔍 创建对象错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 检查是否已配对
   */
  async isPaired() {
    console.log('🔍 检查配对状态...');
    
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      console.log('❌ 未找到 API Key，未配对');
      return false;
    }

    try {
      // 尝试获取空间列表来验证 API Key 是否有效
      console.log('🧪 验证 API Key 有效性...');
      await this.getSpaces();
      console.log('✅ API Key 有效，已配对');
      return true;
    } catch (error) {
      console.warn('⚠️ API Key 可能已失效:', error);
      // 清除无效的 API Key
      await this.saveApiKey(null);
      console.log('🗑️ 已清除无效的 API Key');
      return false;
    }
  }

  /**
   * 清除配对信息
   */
  async clearPairing() {
    console.log('🗑️ 清除配对信息...');
    await this.saveApiKey(null);
    console.log('✅ 配对信息已清除');
  }
}

// 使用 ES 模块导出，外部可自行实例化
export default AnytypeAPI;
