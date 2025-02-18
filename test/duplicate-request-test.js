const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function testDuplicateRequests() {
  const baseUrl = 'http://localhost:3000/api/chat';
  const requestId = uuidv4();

  console.log('重複リクエストテスト開始');

  try {
    // 最初のリクエスト
    const firstResponse = await axios.post(baseUrl, 
      { message: 'テストメッセージ' }, 
      { 
        headers: { 
          'X-Request-ID': requestId,
          'Content-Type': 'application/json'
        } 
      }
    );
    console.log('最初のリクエスト成功:', firstResponse.data);

    // 同時に2つのリクエストを送信
    const [secondResponse, thirdResponse] = await Promise.allSettled([
      axios.post(baseUrl, 
        { message: 'テストメッセージ' }, 
        { 
          headers: { 
            'X-Request-ID': requestId,
            'Content-Type': 'application/json'
          },
          validateStatus: () => true  // すべてのステータスコードを許可
        }
      ),
      axios.post(baseUrl, 
        { message: 'テストメッセージ' }, 
        { 
          headers: { 
            'X-Request-ID': requestId,
            'Content-Type': 'application/json'
          },
          validateStatus: () => true  // すべてのステータスコードを許可
        }
      )
    ]);

    // 重複リクエストの検証
    const duplicateResponses = [secondResponse, thirdResponse].filter(
      result => result.status === 'fulfilled' && result.value.status === 409
    );

    if (duplicateResponses.length > 0) {
      console.log('✅ 重複リクエストを正常に検出: 409 Conflict');
      console.log('重複リクエストのエラー詳細:', duplicateResponses[0].value.data);
    } else {
      console.error('❌ 重複リクエストが検出されませんでした');
      console.log('レスポンス詳細:', {
        second: secondResponse.status === 'fulfilled' ? secondResponse.value.status : secondResponse.reason,
        third: thirdResponse.status === 'fulfilled' ? thirdResponse.value.status : thirdResponse.reason
      });
    }
  } catch (error) {
    console.error('テスト中にエラー発生:', error.message);
  }
}

testDuplicateRequests();
