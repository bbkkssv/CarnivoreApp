// Test the PreferenceService with our database
const { PrismaClient } = require('@prisma/client')

// Create a simple test version of PreferenceService in JS
const prisma = new PrismaClient()

const NutritionalProfile = {
  STRICT: 'STRICT',
  LEANER: 'LEANER',
  WITH_DAIRY: 'WITH_DAIRY',
  BUDGET: 'BUDGET'
}

async function testPreferenceService() {
  try {
    console.log('🧪 Testing PreferenceService...')

    // Test user ID (we'll create a test user)
    const testUserId = 'test-user-001'

    // Sample onboarding data
    const onboardingData = {
      responses: {
        age: 30,
        dietaryGoals: ['weight_loss', 'better_energy'],
        currentDiet: 'standard',
        experience: 'beginner',
        preferences: {
          meats: ['beef', 'chicken', 'fish'],
          cookingTime: 30,
          budget: '100-150'
        }
      },
      preferenceProfile: {
        allowedMeats: ['beef', 'chicken', 'salmon'],
        exclusions: ['pork'],
        prepTimePreference: 30,
        budgetRange: '100-150',
        cookingSkill: 'beginner',
        nutritionalProfile: NutritionalProfile.STRICT
      }
    }

    // Test 1: Process onboarding
    console.log('\n1️⃣ Processing onboarding data...')
    const result = await preferenceService.processOnboarding(testUserId, onboardingData)
    console.log('✅ Onboarding processed:', {
      onboardingId: result.onboardingResponse.id,
      profileId: result.preferenceProfile.id
    })

    // Test 2: Get preference profile
    console.log('\n2️⃣ Retrieving preference profile...')
    const profile = await preferenceService.getPreferenceProfile(testUserId)
    console.log('✅ Profile retrieved:', {
      allowedMeats: profile.allowedMeats,
      nutritionalProfile: profile.nutritionalProfile,
      prepTime: profile.prepTimePreference
    })

    // Test 3: Update preferences
    console.log('\n3️⃣ Updating preferences...')
    const updates = {
      allowedMeats: ['beef', 'chicken', 'salmon', 'lamb'],
      prepTimePreference: 45
    }
    const updatedProfile = await preferenceService.updatePreferenceProfile(testUserId, updates)
    console.log('✅ Profile updated:', {
      allowedMeats: updatedProfile.allowedMeats,
      prepTime: updatedProfile.prepTimePreference
    })

    // Test 4: Get nutritional constraints
    console.log('\n4️⃣ Generating nutritional constraints...')
    const constraints = await preferenceService.getNutritionalConstraints(testUserId)
    console.log('✅ Constraints generated:', constraints)

    // Test 5: Check onboarding completion
    console.log('\n5️⃣ Checking onboarding completion...')
    const hasCompleted = await preferenceService.hasCompletedOnboarding(testUserId)
    console.log('✅ Onboarding completed:', hasCompleted)

    // Test 6: Validate preference data
    console.log('\n6️⃣ Testing validation...')
    const validationResult = preferenceService.validatePreferenceData({
      allowedMeats: ['beef'],
      prepTimePreference: 25,
      cookingSkill: 'intermediate'
    })
    console.log('✅ Validation result:', validationResult)

    console.log('\n🎉 All PreferenceService tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await preferenceService.disconnect()
  }
}

testPreferenceService()