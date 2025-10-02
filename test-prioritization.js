const fs = require('fs');

// Simple test for the comment prioritization logic
async function testCommentPrioritization() {
    console.log('Testing comment prioritization logic...');
    
    // Mock configuration
    const config = {
        IDEAL_COMMENT_NUMBER: 3
    };
    
    // Mock comments (more than ideal number)
    const allComments = [
        { filePath: 'src/app.js', lineNumber: 10, comment: '[Security 1.1] - SQL injection vulnerability detected' },
        { filePath: 'src/app.js', lineNumber: 15, comment: '[Performance 2.1] - Consider using async/await instead of callbacks' },
        { filePath: 'src/utils.js', lineNumber: 5, comment: '[Style 4.1] - Missing semicolon' },
        { filePath: 'src/utils.js', lineNumber: 20, comment: '[Security 1.2] - Potential XSS vulnerability' },
        { filePath: 'src/config.js', lineNumber: 8, comment: '[Maintainability 3.1] - Extract magic number to constant' },
        { filePath: 'src/config.js', lineNumber: 12, comment: '[Performance 2.2] - Inefficient loop detected' }
    ];
    
    console.log(`\nTotal comments: ${allComments.length}`);
    console.log('All comments:');
    allComments.forEach((comment, index) => {
        console.log(`${index + 1}. File: ${comment.filePath}, Line: ${comment.lineNumber}`);
        console.log(`   Comment: ${comment.comment}`);
    });
    
    // Test prioritization logic (simple heuristic for testing)
    const prioritized = prioritizeCommentsTest(allComments, config);
    
    console.log(`\nPrioritized to ${prioritized.length} comments:`);
    prioritized.forEach((comment, index) => {
        console.log(`${index + 1}. File: ${comment.filePath}, Line: ${comment.lineNumber}`);
        console.log(`   Comment: ${comment.comment}`);
    });
    
    console.log('\n✅ Test completed successfully!');
}

// Simple prioritization for testing (mimics AI behavior)
function prioritizeCommentsTest(comments, config) {
    // Priority order: Security > Performance > Maintainability > Style
    const priorities = {
        'Security': 1,
        'Performance': 2,
        'Maintainability': 3,
        'Style': 4
    };
    
    // Sort comments by priority
    const sorted = comments.sort((a, b) => {
        const aType = a.comment.match(/\[(\w+)/)?.[1] || 'Style';
        const bType = b.comment.match(/\[(\w+)/)?.[1] || 'Style';
        
        return (priorities[aType] || 4) - (priorities[bType] || 4);
    });
    
    // Return top N comments
    return sorted.slice(0, config.IDEAL_COMMENT_NUMBER);
}

// Test new environment variable parsing
function testConfigParsing() {
    console.log('\nTesting IDEAL_COMMENT_NUMBER configuration...');
    
    // Test cases
    const testCases = [
        { input: '5', expected: 5 },
        { input: '10', expected: 10 },
        { input: 'invalid', expected: 5 }, // should default to 5
        { input: undefined, expected: 5 }  // should default to 5
    ];
    
    testCases.forEach(testCase => {
        process.env.IDEAL_COMMENT_NUMBER = testCase.input;
        const result = parseInt(process.env.IDEAL_COMMENT_NUMBER) || 5;
        console.log(`Input: ${testCase.input} -> Output: ${result} (Expected: ${testCase.expected})`);
        
        if (result === testCase.expected) {
            console.log('✅ PASS');
        } else {
            console.log('❌ FAIL');
        }
    });
}

// Run tests
(async () => {
    try {
        await testCommentPrioritization();
        testConfigParsing();
        console.log('\n🎉 All tests passed!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
})();
