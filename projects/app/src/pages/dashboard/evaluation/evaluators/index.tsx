'use client';
import MyBox from '@fastgpt/web/components/common/MyBox';
import DashboardContainer from '@/pageComponents/dashboard/Container';
import { serviceSideProps } from '@/web/common/i18n/utils';
import { useTranslation } from 'next-i18next';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Badge,
  VStack,
  HStack
} from '@chakra-ui/react';
import SearchInput from '@fastgpt/web/components/common/Input/SearchInput';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useRouter } from 'next/router';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { formatTime2YMDHM } from '@fastgpt/global/common/string/time';
import { usePagination } from '@fastgpt/web/hooks/usePagination';
import { useState } from 'react';
import EmptyTip from '@fastgpt/web/components/common/EmptyTip';
import type { Evaluator } from '@fastgpt/global/core/evaluation/type';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import PopoverConfirm from '@fastgpt/web/components/common/MyPopover/PopoverConfirm';
import { useToast } from '@fastgpt/web/hooks/useToast';

import {
  getEvaluatorList,
  deleteEvaluator,
  postTestEvaluator
} from '@/web/core/evaluation/evaluation';

const EvaluationEvaluators = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchKey, setSearchKey] = useState('');

  // 适配器函数匹配分页参数格式
  const getEvaluatorListAdapter = async (params: any) => {
    return getEvaluatorList({
      searchKey: params.searchKey || '',
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 20
    });
  };

  const {
    data: evaluatorList,
    isLoading,
    Pagination,
    getData: fetchData
  } = usePagination(getEvaluatorListAdapter, {
    pageSize: 20,
    params: {
      searchKey
    },
    refreshDeps: [searchKey]
  });

  const { runAsync: onDeleteEvaluator } = useRequest2(deleteEvaluator, {
    onSuccess: () => {
      toast({
        title: t('common:Delete Success'),
        status: 'success'
      });
      fetchData();
    },
    onError: (error) => {
      toast({
        title: t('common:Delete Failed'),
        description: error.message,
        status: 'error'
      });
    }
  });

  const getEvaluatorTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      accuracy: 'green',
      semantic_similarity: 'blue',
      custom: 'purple',
      llm: 'orange'
    };
    return colorMap[type] || 'gray';
  };

  const columns = [
    {
      title: t('common:Name'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Evaluator) => (
        <Box
          cursor="pointer"
          color="primary.600"
          _hover={{ textDecoration: 'underline' }}
          onClick={() => router.push(`/dashboard/evaluation/evaluators/${record.id}`)}
        >
          {name}
        </Box>
      )
    },
    {
      title: t('common:Description'),
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => (
        <Box color="gray.600" noOfLines={2}>
          {description || '-'}
        </Box>
      )
    },
    {
      title: t('common:Type'),
      dataIndex: 'config',
      key: 'type',
      render: (config: any) => (
        <Badge colorScheme={getEvaluatorTypeColor(config.type)}>
          {config.type.replace('_', ' ').toUpperCase()}
        </Badge>
      )
    },
    {
      title: t('common:Create Time'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: Date) => (
        <Box fontSize="sm" color="gray.600">
          {formatTime2YMDHM(time)}
        </Box>
      )
    },
    {
      title: t('common:Action'),
      key: 'action',
      render: (_: unknown, record: Evaluator) => (
        <HStack spacing={2}>
          <MyTooltip label={t('common:Edit')}>
            <IconButton
              aria-label="Edit"
              icon={<MyIcon name="common/edit" w="14px" />}
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/evaluation/evaluators/${record.id}/edit`)}
            />
          </MyTooltip>
          <MyTooltip label={t('common:Test')}>
            <IconButton
              aria-label="Test"
              // 修复图标名称错误，使用支持的图标名
              icon={<MyIcon name="common/addLight" w="14px" />}
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/evaluation/evaluators/${record.id}/test`)}
            />
          </MyTooltip>
          {/* 修复PopoverConfirm属性错误，使用content代替title和description */}
          <PopoverConfirm
            onConfirm={() => onDeleteEvaluator(record.id)}
            content={t('common:Confirm Delete')}
            Trigger={
              <MyTooltip label={t('common:Delete')}>
                <IconButton
                  aria-label="Delete"
                  icon={<MyIcon name="common/trash" w="14px" />}
                  variant="ghost"
                  size="sm"
                  colorScheme="red"
                />
              </MyTooltip>
            }
          />
        </HStack>
      )
    }
  ];

  const handleSearch = () => {
    fetchData();
  };

  return (
    <DashboardContainer>
      {({ MenuIcon }) => (
        <MyBox isLoading={isLoading}>
          <VStack spacing={4} align="stretch" p={6}>
            {/* Header */}
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <Box fontSize="2xl" fontWeight="bold">
                  {t('dashboard_evaluation:Evaluators')}
                </Box>
                <Box color="gray.600" fontSize="sm">
                  {t('dashboard_evaluation:Evaluators_Intro')}
                </Box>
              </Box>
              <Button
                leftIcon={<MyIcon name="common/addLight" w="14px" />}
                colorScheme="blue"
                onClick={() => router.push('/dashboard/evaluation/evaluators/create')}
              >
                {t('common:Create')}
              </Button>
            </Flex>

            {/* Search */}
            <HStack>
              <SearchInput
                placeholder={t('common:Search')}
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                w="300px"
              />
              <Button onClick={handleSearch} size="sm">
                {t('common:Search')}
              </Button>
            </HStack>

            {/* Table */}
            {evaluatorList && evaluatorList.length > 0 ? (
              <Box>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        {columns.map((column) => (
                          <Th key={column.key}>{column.title}</Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {evaluatorList.map((evaluator: Evaluator) => (
                        <Tr key={evaluator.id}>
                          {/* 名称列 */}
                          <Td>
                            <Box
                              cursor="pointer"
                              color="primary.600"
                              _hover={{ textDecoration: 'underline' }}
                              onClick={() =>
                                router.push(`/dashboard/evaluation/evaluators/${evaluator.id}`)
                              }
                            >
                              {evaluator.name}
                            </Box>
                          </Td>

                          {/* 描述列 */}
                          <Td>
                            <Box color="gray.600" noOfLines={2}>
                              {evaluator.description || '-'}
                            </Box>
                          </Td>

                          {/* 类型列 */}
                          <Td>
                            <Badge colorScheme={getEvaluatorTypeColor(evaluator.config?.type)}>
                              {evaluator.config?.type.replace('_', ' ').toUpperCase() || '-'}
                            </Badge>
                          </Td>

                          {/* 创建时间列 */}
                          <Td>
                            <Box fontSize="sm" color="gray.600">
                              {formatTime2YMDHM(new Date(evaluator.created_at))}
                            </Box>
                          </Td>

                          {/* 操作列 */}
                          <Td>
                            <HStack spacing={2}>
                              <MyTooltip label={t('common:Edit')}>
                                <IconButton
                                  aria-label="Edit"
                                  icon={<MyIcon name="common/edit" w="14px" />}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    router.push(
                                      `/dashboard/evaluation/evaluators/${evaluator.id}/edit`
                                    )
                                  }
                                />
                              </MyTooltip>
                              <MyTooltip label={t('common:Test')}>
                                <IconButton
                                  aria-label="Test"
                                  icon={<MyIcon name="common/check" w="14px" />}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    router.push(
                                      `/dashboard/evaluation/evaluators/${evaluator.id}/test`
                                    )
                                  }
                                />
                              </MyTooltip>
                              <PopoverConfirm
                                onConfirm={() => onDeleteEvaluator(evaluator.id)}
                                content={t('common:Confirm Delete')}
                                Trigger={
                                  <MyTooltip label={t('common:Delete')}>
                                    <IconButton
                                      aria-label="Delete"
                                      icon={<MyIcon name="common/trash" w="14px" />}
                                      variant="ghost"
                                      size="sm"
                                      colorScheme="red"
                                    />
                                  </MyTooltip>
                                }
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
                <Flex mt={4} justifyContent="flex-end">
                  <Pagination />
                </Flex>
              </Box>
            ) : (
              <EmptyTip text={t('dashboard_evaluation:Evaluators_Notfound')} />
            )}
          </VStack>
        </MyBox>
      )}
    </DashboardContainer>
  );
};

export default EvaluationEvaluators;

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content, ['dashboard_evaluation', 'common']))
    }
  };
}
